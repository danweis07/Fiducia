/**
 * Location Adapter Interface
 *
 * Defines the contract for ATM / branch locator services.
 * Implementations may query a local database, a shared-branch network
 * (CO-OP, Allpoint, MoneyPass), or a third-party provider.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export type LocationType = 'atm' | 'branch' | 'shared_branch';

export interface LocationSearchRequest {
  tenantId: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  type?: LocationType;
  limit: number;
  offset: number;
}

export interface LocationResult {
  id: string;
  name: string;
  type: LocationType;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  distanceMiles: number;
  hours: Record<string, string> | null;
  services: string[];
  isOpen: boolean;
  isDepositAccepting: boolean;
  network: string | null;
}

export interface LocationSearchResponse {
  locations: LocationResult[];
  total: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface LocationAdapter extends BaseAdapter {
  /** Search for ATMs and/or branches near a geographic coordinate. */
  search(request: LocationSearchRequest): Promise<LocationSearchResponse>;
}
