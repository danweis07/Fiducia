import type { LocationAdapter } from './types.ts';
import { MockLocationAdapter } from './mock-adapter.ts';
import { OverpassLocationAdapter } from './overpass-adapter.ts';

export function createLocationAdapter(provider: string): LocationAdapter {
  switch (provider) {
    case 'overpass':
    case 'osm': return new OverpassLocationAdapter();
    case 'mock':
    default: return new MockLocationAdapter();
  }
}
