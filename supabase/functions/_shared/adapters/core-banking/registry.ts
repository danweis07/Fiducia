import type { EnvProvider } from '../../platform/types.ts';
import type { CoreBankingAdapter } from './types.ts';
import { MockCoreBankingAdapter } from './mock-adapter.ts';
import { FineractCoreBankingAdapter } from './fineract-adapter.ts';
import { MifosCoreBankingAdapter } from './mifos-adapter.ts';
import { CUAnswersCoreBankingAdapter } from './cuanswers-adapter.ts';
import { SymitarCoreBankingAdapter } from './symitar-adapter.ts';
import { FiservCoreBankingAdapter } from './fiserv-adapter.ts';
import { KeyStoneCoreBankingAdapter } from './keystone-adapter.ts';
import { FISCoreBankingAdapter } from './fis-adapter.ts';
import { FLEXCoreBankingAdapter } from './flex-adapter.ts';
import { MambuCoreBankingAdapter } from './mambu-adapter.ts';
import { ThoughtMachineCoreBankingAdapter } from './thought-machine-adapter.ts';
import { PismoCoreBankingAdapter } from './pismo-adapter.ts';
import { TemenosAdapter } from './temenos-adapter.ts';
import { FlexcubeAdapter } from './flexcube-adapter.ts';
import { FinacleAdapter } from './finacle-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createCoreBankingAdapter(provider: string): CoreBankingAdapter {
  switch (provider) {
    case 'fineract': return new FineractCoreBankingAdapter();
    case 'mifos':
    case 'mifos_x': return new MifosCoreBankingAdapter();
    case 'cuanswers':
    case 'cubase': return new CUAnswersCoreBankingAdapter();
    case 'symitar':
    case 'symxchange': return new SymitarCoreBankingAdapter();
    case 'fiserv':
    case 'fiserv_dna':
    case 'fiserv_premier':
    case 'fiserv_signature': return new FiservCoreBankingAdapter();
    case 'keystone':
    case 'corelation':
    case 'keybridge': return new KeyStoneCoreBankingAdapter();
    case 'fis':
    case 'fis_code_connect':
    case 'horizon': return new FISCoreBankingAdapter();
    case 'flex':
    case 'flexbridge': return new FLEXCoreBankingAdapter();
    case 'mambu': return new MambuCoreBankingAdapter();
    case 'thought_machine':
    case 'vault': return new ThoughtMachineCoreBankingAdapter();
    case 'pismo': return new PismoCoreBankingAdapter();
    case 'temenos':
    case 'temenos_transact':
    case 't24': return new TemenosAdapter();
    case 'flexcube':
    case 'oracle_flexcube': return new FlexcubeAdapter();
    case 'finacle':
    case 'infosys_finacle': return new FinacleAdapter();
    case 'mock':
    default: return new MockCoreBankingAdapter();
  }
}

export function detectCoreBankingProvider(env?: EnvProvider): string {
  if (getEnv('FISERV_CLIENT_ID', env)) return 'fiserv';
  if (getEnv('KEYSTONE_GATEWAY_URL', env)) return 'keystone';
  if (getEnv('FIS_CLIENT_ID', env)) return 'fis';
  if (getEnv('SYMITAR_HOST', env)) return 'symitar';
  if (getEnv('CUANSWERS_APP_KEY', env)) return 'cuanswers';
  if (getEnv('MIFOS_GROUP_LENDING', env)) return 'mifos';
  if (getEnv('FINERACT_BASE_URL', env)) return 'fineract';
  if (getEnv('FLEX_API_KEY', env)) return 'flex';
  if (getEnv('MAMBU_API_KEY', env)) return 'mambu';
  if (getEnv('THOUGHT_MACHINE_AUTH_TOKEN', env)) return 'thought_machine';
  if (getEnv('PISMO_API_KEY', env)) return 'pismo';
  if (getEnv('TEMENOS_BASE_URL', env)) return 'temenos';
  if (getEnv('FLEXCUBE_BASE_URL', env)) return 'flexcube';
  if (getEnv('FINACLE_BASE_URL', env)) return 'finacle';
  return 'mock';
}
