import type { RDCAdapter } from './types.ts';
import { MockRDCAdapter } from './mock-adapter.ts';
import { SyncteraRDCAdapter } from './synctera-adapter.ts';
import { UnitRDCAdapter } from './unit-adapter.ts';
import { MitekRDCAdapter } from './mitek-adapter.ts';
import { CUAnswersRDCAdapter } from './cuanswers-adapter.ts';
import { JackHenryRDCAdapter } from './jackhenry-adapter.ts';

export function createRDCAdapter(provider: string): RDCAdapter {
  switch (provider) {
    case 'synctera': return new SyncteraRDCAdapter();
    case 'unit': return new UnitRDCAdapter();
    case 'mitek': return new MitekRDCAdapter();
    case 'cuanswers':
    case 'cubase': return new CUAnswersRDCAdapter();
    case 'jackhenry':
    case '4sight':
    case 'jxchange': return new JackHenryRDCAdapter();
    case 'mock':
    default: return new MockRDCAdapter();
  }
}
