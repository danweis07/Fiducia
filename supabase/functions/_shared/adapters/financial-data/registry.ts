import type { FinancialDataAdapter } from './types.ts';
import { MockFinancialDataAdapter } from './mock-adapter.ts';
import { MXFinancialDataAdapter } from './mx-adapter.ts';

export function createFinancialDataAdapter(provider: string): FinancialDataAdapter {
  switch (provider) {
    case 'mx': return new MXFinancialDataAdapter();
    case 'mock':
    default: return new MockFinancialDataAdapter();
  }
}
