/**
 * Mock Multi-Currency Adapter
 *
 * Returns synthetic multi-currency pot, vIBAN, FX swap,
 * safeguarding, withholding, and carbon data for sandbox/testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  MultiCurrencyAdapter,
  CurrencyPot,
  FXSwap,
  FXSwapQuote,
  SafeguardingInfo,
  InterestWithholdingEntry,
  CarbonFootprint,
  CarbonSummary,
  ListPotsRequest,
  ListPotsResponse,
  CreatePotRequest,
  CreatePotResponse,
  GetPotRequest,
  GenerateVIBANRequest,
  GenerateVIBANResponse,
  GetSwapQuoteRequest,
  ExecuteSwapRequest,
  ExecuteSwapResponse,
  ListSwapsRequest,
  ListSwapsResponse,
  ClosePotRequest,
  GetSafeguardingRequest,
  GetSafeguardingResponse,
  ListWithholdingRequest,
  ListWithholdingResponse,
  GetCarbonFootprintRequest,
  GetCarbonSummaryRequest,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

function mockPots(): CurrencyPot[] {
  return [
    {
      potId: 'POT-USD-001',
      memberId: 'MBR-001',
      currency: 'USD',
      currencyName: 'US Dollar',
      balanceCents: 1250000,
      availableBalanceCents: 1250000,
      status: 'active',
      viban: {
        vibanId: 'VIBAN-USD-001',
        potId: 'POT-USD-001',
        country: 'US',
        currency: 'USD',
        iban: '',
        bic: '',
        routingNumber: '021000021',
        accountNumber: '****6789',
        bankName: 'JPMorgan Chase',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
      },
      isDefault: true,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-03-16T08:00:00Z',
    },
    {
      potId: 'POT-GBP-001',
      memberId: 'MBR-001',
      currency: 'GBP',
      currencyName: 'British Pound',
      balanceCents: 850000,
      availableBalanceCents: 850000,
      status: 'active',
      viban: {
        vibanId: 'VIBAN-GBP-001',
        potId: 'POT-GBP-001',
        country: 'GB',
        currency: 'GBP',
        iban: 'GB29 NWBK 6016 1331 9268 19',
        bic: 'NWBKGB2L',
        sortCode: '60-16-13',
        accountNumber: '****9268',
        bankName: 'ClearBank',
        status: 'active',
        createdAt: '2026-02-01T10:00:00Z',
      },
      isDefault: false,
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-03-16T08:00:00Z',
    },
    {
      potId: 'POT-EUR-001',
      memberId: 'MBR-001',
      currency: 'EUR',
      currencyName: 'Euro',
      balanceCents: 420000,
      availableBalanceCents: 420000,
      status: 'active',
      viban: {
        vibanId: 'VIBAN-EUR-001',
        potId: 'POT-EUR-001',
        country: 'DE',
        currency: 'EUR',
        iban: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFFXXX',
        bankName: 'Solaris SE',
        status: 'active',
        createdAt: '2026-02-01T10:00:00Z',
      },
      isDefault: false,
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-03-16T08:00:00Z',
    },
    {
      potId: 'POT-BRL-001',
      memberId: 'MBR-001',
      currency: 'BRL',
      currencyName: 'Brazilian Real',
      balanceCents: 3500000,
      availableBalanceCents: 3500000,
      status: 'active',
      viban: null,
      isDefault: false,
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-16T08:00:00Z',
    },
    {
      potId: 'POT-INR-001',
      memberId: 'MBR-001',
      currency: 'INR',
      currencyName: 'Indian Rupee',
      balanceCents: 15000000,
      availableBalanceCents: 15000000,
      status: 'active',
      viban: null,
      isDefault: false,
      createdAt: '2026-03-05T10:00:00Z',
      updatedAt: '2026-03-16T08:00:00Z',
    },
  ];
}

function mockSwaps(): FXSwap[] {
  return [
    {
      swapId: 'SWAP-001',
      fromPotId: 'POT-USD-001',
      toPotId: 'POT-EUR-001',
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      fromAmountCents: 100000,
      toAmountCents: 92150,
      exchangeRate: 0.9215,
      inverseRate: 1.0852,
      feeAmountCents: 50,
      feeCurrency: 'USD',
      status: 'completed',
      executedAt: '2026-03-15T14:30:00Z',
      createdAt: '2026-03-15T14:30:00Z',
    },
    {
      swapId: 'SWAP-002',
      fromPotId: 'POT-GBP-001',
      toPotId: 'POT-USD-001',
      fromCurrency: 'GBP',
      toCurrency: 'USD',
      fromAmountCents: 50000,
      toAmountCents: 63250,
      exchangeRate: 1.2650,
      inverseRate: 0.7905,
      feeAmountCents: 35,
      feeCurrency: 'GBP',
      status: 'completed',
      executedAt: '2026-03-14T10:00:00Z',
      createdAt: '2026-03-14T10:00:00Z',
    },
  ];
}

function mockSafeguarding(): SafeguardingInfo[] {
  return [
    {
      custodianName: 'ClearBank Ltd',
      custodianType: 'Authorized Credit Institution',
      protectionScheme: 'Financial Services Compensation Scheme (FSCS)',
      protectionLimit: '£85,000',
      protectionCurrency: 'GBP',
      regulatoryBody: 'Financial Conduct Authority (FCA)',
      country: 'GB',
      lastAuditDate: '2026-01-15',
      certificateUrl: 'https://register.fca.org.uk/s/firm?id=001b000003ABC',
    },
    {
      custodianName: 'Solaris SE',
      custodianType: 'Licensed Bank',
      protectionScheme: 'Einlagensicherungsfonds (Deposit Guarantee Scheme)',
      protectionLimit: '€100,000',
      protectionCurrency: 'EUR',
      regulatoryBody: 'BaFin (Federal Financial Supervisory Authority)',
      country: 'DE',
      lastAuditDate: '2026-02-01',
    },
    {
      custodianName: 'JPMorgan Chase Bank, N.A.',
      custodianType: 'FDIC Insured Bank',
      protectionScheme: 'Federal Deposit Insurance Corporation (FDIC)',
      protectionLimit: '$250,000',
      protectionCurrency: 'USD',
      regulatoryBody: 'OCC / Federal Reserve',
      country: 'US',
      lastAuditDate: '2025-12-15',
    },
  ];
}

function mockWithholding(): InterestWithholdingEntry[] {
  return [
    {
      entryId: 'WH-001',
      accountId: 'POT-GBP-001',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      grossInterestCents: 4250,
      taxWithheldCents: 850,
      netInterestCents: 3400,
      withholdingRateBps: 2000,
      currency: 'GBP',
      taxAuthority: 'HMRC',
      jurisdiction: 'United Kingdom',
      paidAt: '2026-02-01T00:00:00Z',
    },
    {
      entryId: 'WH-002',
      accountId: 'POT-EUR-001',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      grossInterestCents: 3100,
      taxWithheldCents: 813,
      netInterestCents: 2287,
      withholdingRateBps: 2625,
      currency: 'EUR',
      taxAuthority: 'Bundeszentralamt für Steuern',
      jurisdiction: 'Germany',
      paidAt: '2026-02-01T00:00:00Z',
    },
    {
      entryId: 'WH-003',
      accountId: 'POT-GBP-001',
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      grossInterestCents: 3890,
      taxWithheldCents: 778,
      netInterestCents: 3112,
      withholdingRateBps: 2000,
      currency: 'GBP',
      taxAuthority: 'HMRC',
      jurisdiction: 'United Kingdom',
      paidAt: '2026-03-01T00:00:00Z',
    },
  ];
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockMultiCurrencyAdapter implements MultiCurrencyAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-multi-currency',
    name: 'Mock Multi-Currency Adapter',
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

  async listPots(request: ListPotsRequest): Promise<ListPotsResponse> {
    let pots = mockPots();
    if (request.status) pots = pots.filter(p => p.status === request.status);
    return { pots };
  }

  async createPot(request: CreatePotRequest): Promise<CreatePotResponse> {
    const currencyNames: Record<string, string> = {
      USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
      BRL: 'Brazilian Real', INR: 'Indian Rupee', SGD: 'Singapore Dollar',
      AUD: 'Australian Dollar', CAD: 'Canadian Dollar', JPY: 'Japanese Yen',
      CHF: 'Swiss Franc', MXN: 'Mexican Peso', SEK: 'Swedish Krona',
    };
    const now = new Date().toISOString();
    return {
      pot: {
        potId: `POT-${request.currency}-${Date.now()}`,
        memberId: 'MBR-001',
        currency: request.currency,
        currencyName: currencyNames[request.currency] ?? request.currency,
        balanceCents: request.initialDepositCents ?? 0,
        availableBalanceCents: request.initialDepositCents ?? 0,
        status: 'active',
        viban: null,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  async getPot(request: GetPotRequest): Promise<CurrencyPot> {
    const pots = mockPots();
    return pots.find(p => p.potId === request.potId) ?? pots[0];
  }

  async generateVIBAN(request: GenerateVIBANRequest): Promise<GenerateVIBANResponse> {
    const bankMap: Record<string, { iban: string; bic: string; bankName: string; sortCode?: string }> = {
      GB: { iban: 'GB82 WEST 1234 5698 7654 32', bic: 'WESTGB2L', bankName: 'ClearBank', sortCode: '12-34-56' },
      DE: { iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX', bankName: 'Solaris SE' },
      FR: { iban: 'FR76 3000 6000 0112 3456 7890 189', bic: 'BNPAFRPP', bankName: 'BNP Paribas' },
      NL: { iban: 'NL91 ABNA 0417 1643 00', bic: 'ABNANL2A', bankName: 'ABN AMRO' },
    };

    const bank = bankMap[request.country] ?? { iban: `${request.country}XX MOCK 0000 0000 0000`, bic: 'MOCKXXXX', bankName: 'Mock Bank' };

    return {
      viban: {
        vibanId: `VIBAN-${Date.now()}`,
        potId: request.potId,
        country: request.country,
        currency: request.country === 'GB' ? 'GBP' : request.country === 'US' ? 'USD' : 'EUR',
        iban: bank.iban,
        bic: bank.bic,
        sortCode: bank.sortCode,
        bankName: bank.bankName,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async getSwapQuote(request: GetSwapQuoteRequest): Promise<FXSwapQuote> {
    const rates: Record<string, Record<string, number>> = {
      USD: { EUR: 0.9215, GBP: 0.7905, BRL: 5.0120, INR: 83.2500 },
      EUR: { USD: 1.0852, GBP: 0.8578, BRL: 5.4380, INR: 90.3400 },
      GBP: { USD: 1.2650, EUR: 1.1658, BRL: 6.3400, INR: 105.2800 },
      BRL: { USD: 0.1995, EUR: 0.1839, GBP: 0.1578 },
      INR: { USD: 0.0120, EUR: 0.0111, GBP: 0.0095 },
    };

    const fromPot = mockPots().find(p => p.potId === request.fromPotId);
    const toPot = mockPots().find(p => p.potId === request.toPotId);
    const fromCurrency = fromPot?.currency ?? 'USD';
    const toCurrency = toPot?.currency ?? 'EUR';
    const midMarketRate = rates[fromCurrency]?.[toCurrency] ?? 1;
    const markup = 0.003;
    const rate = midMarketRate * (1 - markup);
    const toAmountCents = Math.round(request.fromAmountCents * rate);
    const feeCents = Math.max(Math.round(request.fromAmountCents * 0.0005), 50);

    return {
      quoteId: `QUOTE-${Date.now()}`,
      fromCurrency,
      toCurrency,
      fromAmountCents: request.fromAmountCents,
      toAmountCents,
      exchangeRate: rate,
      inverseRate: 1 / rate,
      midMarketRate,
      markup,
      feeAmountCents: feeCents,
      feeCurrency: fromCurrency,
      expiresAt: new Date(Date.now() + 30000).toISOString(),
    };
  }

  async executeSwap(request: ExecuteSwapRequest): Promise<ExecuteSwapResponse> {
    const quote = await this.getSwapQuote({
      tenantId: request.tenantId,
      fromPotId: request.fromPotId,
      toPotId: request.toPotId,
      fromAmountCents: request.fromAmountCents,
    });

    const now = new Date().toISOString();
    return {
      swap: {
        swapId: `SWAP-${Date.now()}`,
        fromPotId: request.fromPotId,
        toPotId: request.toPotId,
        fromCurrency: quote.fromCurrency,
        toCurrency: quote.toCurrency,
        fromAmountCents: quote.fromAmountCents,
        toAmountCents: quote.toAmountCents,
        exchangeRate: quote.exchangeRate,
        inverseRate: quote.inverseRate,
        feeAmountCents: quote.feeAmountCents,
        feeCurrency: quote.feeCurrency,
        status: 'completed',
        executedAt: now,
        createdAt: now,
      },
    };
  }

  async listSwaps(request: ListSwapsRequest): Promise<ListSwapsResponse> {
    let swaps = mockSwaps();
    if (request.potId) swaps = swaps.filter(s => s.fromPotId === request.potId || s.toPotId === request.potId);
    const limit = request.limit ?? 50;
    return {
      swaps: swaps.slice(0, limit),
      total: swaps.length,
      hasMore: swaps.length > limit,
      nextCursor: null,
    };
  }

  async closePot(_request: ClosePotRequest): Promise<{ success: boolean }> {
    return { success: true };
  }

  async getSafeguarding(_request: GetSafeguardingRequest): Promise<GetSafeguardingResponse> {
    return { safeguarding: mockSafeguarding() };
  }

  async listWithholding(request: ListWithholdingRequest): Promise<ListWithholdingResponse> {
    let entries = mockWithholding();
    if (request.accountId) entries = entries.filter(e => e.accountId === request.accountId);
    if (request.currency) entries = entries.filter(e => e.currency === request.currency);
    const totalGross = entries.reduce((s, e) => s + e.grossInterestCents, 0);
    const totalTax = entries.reduce((s, e) => s + e.taxWithheldCents, 0);
    return {
      entries,
      totalGrossInterestCents: totalGross,
      totalTaxWithheldCents: totalTax,
      totalNetInterestCents: totalGross - totalTax,
    };
  }

  async getCarbonFootprint(_request: GetCarbonFootprintRequest): Promise<CarbonFootprint> {
    return {
      transactionId: _request.transactionId,
      merchantName: 'Shell Energy',
      category: 'Utilities',
      carbonKg: 12.5,
      carbonRating: 'medium',
      treesEquivalent: 0.6,
      countryAvgKg: 15.2,
      calculationMethod: 'Doconomy Åland Index',
      offsetAvailable: true,
    };
  }

  async getCarbonSummary(_request: GetCarbonSummaryRequest): Promise<CarbonSummary> {
    return {
      periodStart: _request.periodStart,
      periodEnd: _request.periodEnd,
      totalCarbonKg: 245.8,
      transactionCount: 47,
      avgCarbonPerTransaction: 5.23,
      topCategories: [
        { category: 'Transport', carbonKg: 89.2, percentage: 36.3 },
        { category: 'Utilities', carbonKg: 62.4, percentage: 25.4 },
        { category: 'Shopping', carbonKg: 45.1, percentage: 18.3 },
        { category: 'Food & Dining', carbonKg: 32.6, percentage: 13.3 },
        { category: 'Other', carbonKg: 16.5, percentage: 6.7 },
      ],
      monthOverMonthChange: -8.5,
      countryAvgKg: 312.0,
      rating: 'good',
      offsetCostCents: 490,
      offsetCurrency: 'USD',
    };
  }
}
