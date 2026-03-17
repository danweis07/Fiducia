/**
 * Mock Location Adapter
 *
 * Returns synthetic ATM / branch data for development and testing.
 * Locations are generated relative to the requested coordinates.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import type { LocationAdapter, LocationSearchRequest, LocationSearchResponse, LocationResult, LocationType } from './types.ts';

// =============================================================================
// MOCK DATA TEMPLATES
// =============================================================================

interface MockLocationTemplate {
  name: string;
  type: LocationType;
  offsetLat: number;
  offsetLng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  services: string[];
  isDepositAccepting: boolean;
  network: string | null;
}

const MOCK_TEMPLATES: MockLocationTemplate[] = [
  {
    name: 'Main Street Branch',
    type: 'branch',
    offsetLat: 0.005,
    offsetLng: -0.003,
    address: '100 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    phone: '(555) 100-0001',
    services: ['Teller', 'Drive-Thru', 'Safe Deposit', 'Notary', 'Mortgage'],
    isDepositAccepting: true,
    network: null,
  },
  {
    name: 'Downtown ATM',
    type: 'atm',
    offsetLat: 0.002,
    offsetLng: 0.001,
    address: '200 Commerce Ave',
    city: 'Springfield',
    state: 'IL',
    zip: '62702',
    phone: null,
    services: ['Cash Withdrawal', 'Balance Inquiry', 'Deposit'],
    isDepositAccepting: true,
    network: 'CO-OP',
  },
  {
    name: 'Westside Branch',
    type: 'branch',
    offsetLat: -0.008,
    offsetLng: -0.012,
    address: '450 West Blvd',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    phone: '(555) 100-0003',
    services: ['Teller', 'Drive-Thru', 'Coin Counter'],
    isDepositAccepting: true,
    network: null,
  },
  {
    name: 'Gas Station ATM',
    type: 'atm',
    offsetLat: 0.010,
    offsetLng: 0.008,
    address: '789 Highway 66',
    city: 'Springfield',
    state: 'IL',
    zip: '62703',
    phone: null,
    services: ['Cash Withdrawal', 'Balance Inquiry'],
    isDepositAccepting: false,
    network: 'Allpoint',
  },
  {
    name: 'University Branch',
    type: 'branch',
    offsetLat: -0.015,
    offsetLng: 0.006,
    address: '1200 College Dr',
    city: 'Springfield',
    state: 'IL',
    zip: '62705',
    phone: '(555) 100-0005',
    services: ['Teller', 'Student Accounts', 'Notary'],
    isDepositAccepting: true,
    network: null,
  },
  {
    name: 'Grocery Store ATM',
    type: 'atm',
    offsetLat: 0.003,
    offsetLng: -0.009,
    address: '333 Market Ln',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    phone: null,
    services: ['Cash Withdrawal', 'Balance Inquiry'],
    isDepositAccepting: false,
    network: 'MoneyPass',
  },
  {
    name: 'Airport ATM',
    type: 'atm',
    offsetLat: 0.022,
    offsetLng: 0.018,
    address: '1 Airport Rd',
    city: 'Springfield',
    state: 'IL',
    zip: '62707',
    phone: null,
    services: ['Cash Withdrawal', 'Balance Inquiry', 'Currency Exchange'],
    isDepositAccepting: false,
    network: 'CO-OP',
  },
  {
    name: 'Shared Branch — Partner CU',
    type: 'shared_branch',
    offsetLat: -0.011,
    offsetLng: -0.007,
    address: '555 Partner Way',
    city: 'Springfield',
    state: 'IL',
    zip: '62706',
    phone: '(555) 200-0008',
    services: ['Teller', 'Deposits', 'Withdrawals'],
    isDepositAccepting: true,
    network: 'CO-OP Shared Branch',
  },
];

// =============================================================================
// DISTANCE CALCULATION
// =============================================================================

function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =============================================================================
// MOCK ADAPTER
// =============================================================================

export class MockLocationAdapter implements LocationAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-locations',
    name: 'Mock Location Provider',
    retry: { maxRetries: 0, initialDelayMs: 0, maxDelayMs: 0 },
    timeout: { requestTimeoutMs: 5000 },
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 60000, successThreshold: 2 },
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async search(request: LocationSearchRequest): Promise<LocationSearchResponse> {
    const { latitude, longitude, radiusMiles, type, limit, offset } = request;

    // Determine "open" based on mock business hours (9 AM - 5 PM local, Mon-Fri)
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isBusinessHours = day >= 1 && day <= 5 && hour >= 9 && hour < 17;

    let results: LocationResult[] = MOCK_TEMPLATES.map((tmpl, i) => {
      const locLat = latitude + tmpl.offsetLat;
      const locLng = longitude + tmpl.offsetLng;
      const distance = haversineDistanceMiles(latitude, longitude, locLat, locLng);

      return {
        id: `loc_mock_${i + 1}`,
        name: tmpl.name,
        type: tmpl.type,
        latitude: locLat,
        longitude: locLng,
        address: tmpl.address,
        city: tmpl.city,
        state: tmpl.state,
        zip: tmpl.zip,
        phone: tmpl.phone,
        distanceMiles: Math.round(distance * 10) / 10,
        hours: tmpl.type === 'atm'
          ? { 'Mon-Sun': '24 hours' } as Record<string, string>
          : {
              'Mon-Fri': '9:00 AM - 5:00 PM',
              'Sat': '9:00 AM - 1:00 PM',
              'Sun': 'Closed',
            } as Record<string, string>,
        services: tmpl.services,
        isOpen: tmpl.type === 'atm' ? true : isBusinessHours,
        isDepositAccepting: tmpl.isDepositAccepting,
        network: tmpl.network,
      };
    });

    // Filter by type
    if (type) {
      results = results.filter((loc) => loc.type === type);
    }

    // Filter by radius
    results = results.filter((loc) => loc.distanceMiles <= radiusMiles);

    // Sort by distance
    results.sort((a, b) => a.distanceMiles - b.distanceMiles);

    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return { locations: paginated, total };
  }
}
