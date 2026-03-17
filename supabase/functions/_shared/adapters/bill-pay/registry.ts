import type { BillPayAdapter } from './types.ts';
import { MockBillPayAdapter } from './mock-adapter.ts';
import { FiservBillPayAdapter } from './fiserv-adapter.ts';
import { FISBillPayAdapter } from './fis-adapter.ts';
import { JHABillPayAdapter } from './jha-adapter.ts';

export function createBillPayAdapter(provider: string): BillPayAdapter {
  switch (provider) {
    case 'fiserv': return new FiservBillPayAdapter();
    case 'fis': return new FISBillPayAdapter();
    case 'jha':
    case 'ipay': return new JHABillPayAdapter();
    case 'mock':
    default: return new MockBillPayAdapter();
  }
}
