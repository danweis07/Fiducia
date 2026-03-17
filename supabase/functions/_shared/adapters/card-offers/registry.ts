import type { CardOffersAdapter } from './types.ts';
import { MockCardOffersAdapter } from './mock-adapter.ts';
import { CardlyticsAdapter } from './cardlytics-adapter.ts';
import { DoshAdapter } from './dosh-adapter.ts';

export function createCardOffersAdapter(provider: string): CardOffersAdapter {
  switch (provider) {
    case 'cardlytics': return new CardlyticsAdapter();
    case 'dosh': return new DoshAdapter();
    case 'mock':
    default: return new MockCardOffersAdapter();
  }
}
