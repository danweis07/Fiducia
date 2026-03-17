/**
 * Mock Alias Resolution Adapter
 *
 * Returns synthetic alias resolution and R2P data for sandbox/testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  AliasResolutionAdapter,
  AliasResolution,
  RequestToPayInbound,
  RequestToPayOutbound,
  ResolveAliasRequest,
  ResolveAliasResponse,
  PayByAliasRequest,
  PayByAliasResponse,
  ListInboundR2PRequest,
  ListInboundR2PResponse,
  RespondToR2PRequest,
  RespondToR2PResponse,
  SendR2PRequest,
  SendR2PResponse,
  ListOutboundR2PRequest,
  ListOutboundR2PResponse,
  GetSupportedDirectoriesRequest,
  GetSupportedDirectoriesResponse,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

function mockResolution(overrides: Partial<AliasResolution> = {}): AliasResolution {
  return {
    aliasId: 'ALIAS-MOCK-001',
    aliasType: 'phone',
    aliasValue: '+44 7700 900123',
    resolvedName: 'JANE SMITH',
    resolvedInstitution: 'Barclays Bank UK',
    resolvedAccountMasked: '****7890',
    resolvedSortCode: '20-00-00',
    country: 'GB',
    currency: 'GBP',
    availableRails: ['faster_payments', 'sepa_instant'],
    directory: 'UK Faster Payments CoP',
    resolvedAt: '2026-03-16T10:00:00Z',
    expiresAt: '2026-03-16T10:15:00Z',
    ...overrides,
  };
}

function mockInboundR2P(): RequestToPayInbound[] {
  return [
    {
      requestId: 'R2P-IN-001',
      requesterName: 'Thames Water',
      requesterAlias: 'thameswater@payments.uk',
      requesterAliasType: 'email',
      requesterInstitution: 'NatWest Group',
      amountCents: 15450,
      currency: 'GBP',
      description: 'Water bill - March 2026',
      reference: 'TW-INV-2026-03-4521',
      status: 'pending',
      expiresAt: '2026-03-23T23:59:59Z',
      createdAt: '2026-03-16T08:00:00Z',
      respondedAt: null,
    },
    {
      requestId: 'R2P-IN-002',
      requesterName: 'EDF Energy',
      requesterAlias: '+44 7800 100200',
      requesterAliasType: 'phone',
      requesterInstitution: 'HSBC UK',
      amountCents: 8900,
      currency: 'GBP',
      description: 'Electricity bill - Feb 2026',
      reference: 'EDF-2026-02-8821',
      status: 'pending',
      expiresAt: '2026-03-20T23:59:59Z',
      createdAt: '2026-03-15T14:30:00Z',
      respondedAt: null,
    },
    {
      requestId: 'R2P-IN-003',
      requesterName: 'Restaurante do João',
      requesterAlias: '12345678901',
      requesterAliasType: 'tax_id',
      requesterInstitution: 'Banco do Brasil',
      amountCents: 25000,
      currency: 'BRL',
      description: 'Dinner split - Pix cobranças',
      reference: 'PIX-COB-2026-001',
      status: 'approved',
      expiresAt: '2026-03-17T23:59:59Z',
      createdAt: '2026-03-14T20:00:00Z',
      respondedAt: '2026-03-14T20:02:00Z',
    },
  ];
}

function mockOutboundR2P(): RequestToPayOutbound[] {
  return [
    {
      requestId: 'R2P-OUT-001',
      payerName: 'ALEX JOHNSON',
      payerAlias: 'alex.j@email.com',
      payerAliasType: 'email',
      amountCents: 5000,
      currency: 'GBP',
      description: 'Lunch split',
      reference: 'SPLIT-2026-001',
      status: 'pending',
      expiresAt: '2026-03-23T23:59:59Z',
      createdAt: '2026-03-16T12:00:00Z',
      paidAt: null,
    },
    {
      requestId: 'R2P-OUT-002',
      payerName: 'MARIA GARCIA',
      payerAlias: 'priya.s@upi',
      payerAliasType: 'upi_vpa',
      amountCents: 300000,
      currency: 'INR',
      description: 'Rent contribution',
      reference: 'RENT-2026-03',
      status: 'approved',
      expiresAt: '2026-03-20T23:59:59Z',
      createdAt: '2026-03-10T09:00:00Z',
      paidAt: '2026-03-10T09:05:00Z',
    },
  ];
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockAliasResolutionAdapter implements AliasResolutionAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-alias-resolution',
    name: 'Mock Alias Resolution Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
      errorMessage: 'Running in sandbox mode',
    };
  }

  async resolveAlias(request: ResolveAliasRequest): Promise<ResolveAliasResponse> {
    const aliasMap: Record<string, Partial<AliasResolution>> = {
      phone: {
        aliasType: 'phone',
        resolvedName: 'JANE SMITH',
        resolvedInstitution: 'Barclays Bank UK',
        country: 'GB',
        currency: 'GBP',
        directory: 'UK Faster Payments CoP',
        availableRails: ['faster_payments'],
      },
      email: {
        aliasType: 'email',
        resolvedName: 'PIERRE DUPONT',
        resolvedInstitution: 'BNP Paribas',
        resolvedIban: 'FR76****...****4567',
        country: 'FR',
        currency: 'EUR',
        directory: 'SEPA Proxy Lookup',
        availableRails: ['sepa_instant', 'sepa'],
      },
      tax_id: {
        aliasType: 'tax_id',
        resolvedName: 'JOÃO SILVA',
        resolvedInstitution: 'Banco Itaú',
        country: 'BR',
        currency: 'BRL',
        directory: 'BCB Pix DICT',
        availableRails: ['pix'],
      },
      upi_vpa: {
        aliasType: 'upi_vpa',
        resolvedName: 'PRIYA SHARMA',
        resolvedInstitution: 'State Bank of India',
        country: 'IN',
        currency: 'INR',
        directory: 'NPCI UPI',
        availableRails: ['upi'],
      },
      pix_key: {
        aliasType: 'pix_key',
        resolvedName: 'MARIA SANTOS',
        resolvedInstitution: 'Nubank',
        country: 'BR',
        currency: 'BRL',
        directory: 'BCB Pix DICT',
        availableRails: ['pix'],
      },
    };

    const overrides = aliasMap[request.aliasType] ?? {};
    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000);

    return {
      resolution: mockResolution({
        aliasId: `ALIAS-MOCK-${Date.now()}`,
        aliasType: request.aliasType,
        aliasValue: request.aliasValue,
        resolvedAccountMasked: `****${Math.floor(1000 + Math.random() * 9000)}`,
        resolvedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        ...overrides,
      }),
    };
  }

  async payByAlias(_request: PayByAliasRequest): Promise<PayByAliasResponse> {
    return {
      paymentId: `PAY-ALIAS-${Date.now()}`,
      status: 'completed',
      resolvedName: 'RESOLVED RECIPIENT',
      resolvedInstitution: 'Mock International Bank',
      rail: 'faster_payments',
      estimatedArrival: new Date(Date.now() + 5000).toISOString(),
    };
  }

  async listInboundR2P(request: ListInboundR2PRequest): Promise<ListInboundR2PResponse> {
    let requests = mockInboundR2P();
    if (request.status) requests = requests.filter(r => r.status === request.status);
    const limit = request.limit ?? 50;
    return {
      requests: requests.slice(0, limit),
      total: requests.length,
      hasMore: requests.length > limit,
      nextCursor: null,
    };
  }

  async respondToR2P(request: RespondToR2PRequest): Promise<RespondToR2PResponse> {
    return {
      requestId: request.requestId,
      status: request.action === 'approve' ? 'approved' : 'declined',
      paymentId: request.action === 'approve' ? `PAY-R2P-${Date.now()}` : null,
    };
  }

  async sendR2P(request: SendR2PRequest): Promise<SendR2PResponse> {
    return {
      request: {
        requestId: `R2P-OUT-${Date.now()}`,
        payerName: 'PENDING RESOLUTION',
        payerAlias: request.payerAlias,
        payerAliasType: request.payerAliasType,
        amountCents: request.amountCents,
        currency: request.currency,
        description: request.description,
        reference: `REF-${Date.now()}`,
        status: 'pending',
        expiresAt: request.expiresAt,
        createdAt: new Date().toISOString(),
        paidAt: null,
      },
    };
  }

  async listOutboundR2P(request: ListOutboundR2PRequest): Promise<ListOutboundR2PResponse> {
    let requests = mockOutboundR2P();
    if (request.status) requests = requests.filter(r => r.status === request.status);
    const limit = request.limit ?? 50;
    return {
      requests: requests.slice(0, limit),
      total: requests.length,
      hasMore: requests.length > limit,
      nextCursor: null,
    };
  }

  async getSupportedDirectories(_request: GetSupportedDirectoriesRequest): Promise<GetSupportedDirectoriesResponse> {
    return {
      directories: [
        {
          region: 'uk',
          name: 'UK Faster Payments - Confirmation of Payee',
          supportedAliasTypes: ['phone', 'email', 'proxy_id'],
          supportedCurrencies: ['GBP'],
          supportsR2P: true,
        },
        {
          region: 'eu',
          name: 'SEPA Proxy Lookup (SPL)',
          supportedAliasTypes: ['phone', 'email', 'proxy_id'],
          supportedCurrencies: ['EUR'],
          supportsR2P: true,
        },
        {
          region: 'br',
          name: 'BCB Pix DICT',
          supportedAliasTypes: ['phone', 'email', 'tax_id', 'pix_key'],
          supportedCurrencies: ['BRL'],
          supportsR2P: true,
        },
        {
          region: 'in',
          name: 'NPCI Unified Payments Interface',
          supportedAliasTypes: ['phone', 'upi_vpa'],
          supportedCurrencies: ['INR'],
          supportsR2P: true,
        },
        {
          region: 'sg',
          name: 'PayNow (MAS)',
          supportedAliasTypes: ['phone', 'proxy_id'],
          supportedCurrencies: ['SGD'],
          supportsR2P: false,
        },
        {
          region: 'au',
          name: 'NPP PayID',
          supportedAliasTypes: ['phone', 'email'],
          supportedCurrencies: ['AUD'],
          supportsR2P: true,
        },
      ],
    };
  }
}
