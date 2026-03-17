// TODO: Provisional integration — not yet validated in production.
/**
 * OpenStreetMap Overpass Locations Adapter
 *
 * Uses the free, open-source Overpass API to find ATMs and bank branches
 * near a given location. No API key required. No banking data stored on client.
 *
 * Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
 *
 * Configuration:
 *   OVERPASS_API_URL — Custom Overpass endpoint (default: public server)
 *
 * Note: The public Overpass API has rate limits. For production, deploy a
 * private Overpass instance or use a paid provider like Geofabrik.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  LocationAdapter,
  LocationSearchRequest,
  LocationSearchResponse,
  LocationResult,
  LocationType,
} from './types.ts';

// =============================================================================
// OVERPASS RESPONSE TYPES
// =============================================================================

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// =============================================================================
// HELPERS
// =============================================================================

function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function determineLocationType(tags: Record<string, string>): LocationType {
  if (tags.amenity === 'atm' || tags.atm === 'yes') return 'atm';
  if (tags.amenity === 'bank' || tags.office === 'financial') return 'branch';
  return 'atm';
}

function buildAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
  ].filter(Boolean);
  return parts.join(' ') || tags.name || 'Unknown Address';
}

function isLikelyOpen(tags: Record<string, string>): boolean {
  const hours = tags.opening_hours;
  if (!hours) return true; // Unknown = assume open
  if (hours === '24/7') return true;

  // Simple heuristic: check if current day/hour falls in opening hours
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekday = day >= 1 && day <= 5;

  // If we see "Mo-Fr" in the hours string and it's a weekday, check time range
  if (isWeekday && hours.includes('Mo-Fr')) {
    const timeMatch = hours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    if (timeMatch) {
      const openHour = parseInt(timeMatch[1]);
      const closeHour = parseInt(timeMatch[3]);
      return hour >= openHour && hour < closeHour;
    }
  }

  return true;
}

function parseHours(tags: Record<string, string>): Record<string, string> | null {
  const hours = tags.opening_hours;
  if (!hours) return null;
  if (hours === '24/7') return { 'Mon-Sun': '24 hours' };

  // Return raw OpenStreetMap format — frontend can parse
  return { raw: hours };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class OverpassLocationAdapter implements LocationAdapter {
  private readonly baseUrl: string;

  readonly config: AdapterConfig = {
    id: 'overpass-osm',
    name: 'OpenStreetMap (Overpass API)',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 15000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? Deno.env.get('OVERPASS_API_URL') ?? 'https://overpass-api.de/api/interpreter';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(`${this.baseUrl}?data=[out:json];out;`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return {
        adapterId: this.config.id,
        healthy: res.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async search(request: LocationSearchRequest): Promise<LocationSearchResponse> {
    const { latitude, longitude, radiusMiles, type, limit, offset } = request;
    const radiusMeters = Math.round(radiusMiles * 1609.34);

    // Build Overpass QL query for ATMs and banks within radius
    let typeFilter = '';
    if (type === 'atm') {
      typeFilter = `node["amenity"="atm"](around:${radiusMeters},${latitude},${longitude});`;
    } else if (type === 'branch') {
      typeFilter = `
        node["amenity"="bank"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="bank"](around:${radiusMeters},${latitude},${longitude});
      `;
    } else {
      // All types
      typeFilter = `
        node["amenity"="atm"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="bank"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="bank"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="atm"]["atm"="yes"](around:${radiusMeters},${latitude},${longitude});
      `;
    }

    const query = `[out:json][timeout:10];(${typeFilter});out center body;`;

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Overpass API error (${res.status})`);
    }

    const data: OverpassResponse = await res.json();

    // Deduplicate by name + proximity (OSM can have duplicate entries)
    const seen = new Set<string>();
    let results: LocationResult[] = [];

    for (const el of data.elements) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) continue;

      const tags = el.tags ?? {};
      const name = tags.name ?? tags.operator ?? tags.brand ?? 'ATM';
      const dedupeKey = `${name}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const distance = haversineDistanceMiles(latitude, longitude, lat, lon);
      const locType = determineLocationType(tags);

      results.push({
        id: `osm_${el.type}_${el.id}`,
        name,
        type: locType,
        latitude: lat,
        longitude: lon,
        address: buildAddress(tags),
        city: tags['addr:city'] ?? '',
        state: tags['addr:state'] ?? '',
        zip: tags['addr:postcode'] ?? '',
        phone: tags.phone ?? tags['contact:phone'] ?? null,
        distanceMiles: Math.round(distance * 10) / 10,
        hours: parseHours(tags),
        services: locType === 'atm'
          ? ['Cash Withdrawal', 'Balance Inquiry']
          : ['Teller', 'Deposits', 'Withdrawals'],
        isOpen: isLikelyOpen(tags),
        isDepositAccepting: locType === 'branch' || tags.deposit === 'yes',
        network: tags.network ?? tags.operator ?? null,
      });
    }

    // Sort by distance
    results.sort((a, b) => a.distanceMiles - b.distanceMiles);

    const total = results.length;
    results = results.slice(offset, offset + limit);

    return { locations: results, total };
  }
}
