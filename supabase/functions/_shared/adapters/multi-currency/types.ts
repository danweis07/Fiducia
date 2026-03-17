/**
 * Multi-Currency Pots & vIBAN Adapter Interface
 *
 * Defines the port for multi-currency account management:
 *   - Currency pot creation and management
 *   - Virtual IBAN (vIBAN) generation per currency
 *   - Real-time FX swap between pots
 *   - Regulatory transparency (safeguarding, tax withholding, carbon)
 *
 * Implementations:
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// TYPES
// =============================================================================

export type CurrencyPotStatus = 'active' | 'frozen' | 'closed';

export type VIBANStatus = 'active' | 'suspended' | 'closed';

export type FXSwapStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface CurrencyPot {
  potId: string;
  memberId: string;
  currency: string;
  currencyName: string;
  balanceCents: number;
  availableBalanceCents: number;
  status: CurrencyPotStatus;
  viban: VirtualIBAN | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualIBAN {
  vibanId: string;
  potId: string;
  country: string;
  currency: string;
  iban: string;
  bic: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bankName: string;
  status: VIBANStatus;
  createdAt: string;
}

export interface FXSwap {
  swapId: string;
  fromPotId: string;
  toPotId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmountCents: number;
  toAmountCents: number;
  exchangeRate: number;
  inverseRate: number;
  feeAmountCents: number;
  feeCurrency: string;
  status: FXSwapStatus;
  executedAt: string | null;
  createdAt: string;
}

export interface FXSwapQuote {
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmountCents: number;
  toAmountCents: number;
  exchangeRate: number;
  inverseRate: number;
  midMarketRate: number;
  markup: number;
  feeAmountCents: number;
  feeCurrency: string;
  expiresAt: string;
}

export interface SafeguardingInfo {
  custodianName: string;
  custodianType: string;
  protectionScheme: string;
  protectionLimit: string;
  protectionCurrency: string;
  regulatoryBody: string;
  country: string;
  lastAuditDate: string;
  certificateUrl?: string;
}

export interface InterestWithholdingEntry {
  entryId: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  grossInterestCents: number;
  taxWithheldCents: number;
  netInterestCents: number;
  withholdingRateBps: number;
  currency: string;
  taxAuthority: string;
  jurisdiction: string;
  paidAt: string;
}

export interface CarbonFootprint {
  transactionId: string;
  merchantName: string;
  category: string;
  carbonKg: number;
  carbonRating: 'low' | 'medium' | 'high' | 'very_high';
  treesEquivalent: number;
  countryAvgKg: number;
  calculationMethod: string;
  offsetAvailable: boolean;
}

export interface CarbonSummary {
  periodStart: string;
  periodEnd: string;
  totalCarbonKg: number;
  transactionCount: number;
  avgCarbonPerTransaction: number;
  topCategories: Array<{ category: string; carbonKg: number; percentage: number }>;
  monthOverMonthChange: number;
  countryAvgKg: number;
  rating: 'excellent' | 'good' | 'average' | 'above_average' | 'high';
  offsetCostCents: number;
  offsetCurrency: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ListPotsRequest {
  tenantId: string;
  status?: CurrencyPotStatus;
}

export interface ListPotsResponse {
  pots: CurrencyPot[];
}

export interface CreatePotRequest {
  tenantId: string;
  currency: string;
  initialDepositCents?: number;
  sourceAccountId?: string;
}

export interface CreatePotResponse {
  pot: CurrencyPot;
}

export interface GetPotRequest {
  tenantId: string;
  potId: string;
}

export interface GenerateVIBANRequest {
  tenantId: string;
  potId: string;
  country: string;
}

export interface GenerateVIBANResponse {
  viban: VirtualIBAN;
}

export interface GetSwapQuoteRequest {
  tenantId: string;
  fromPotId: string;
  toPotId: string;
  fromAmountCents: number;
}

export interface ExecuteSwapRequest {
  tenantId: string;
  quoteId: string;
  fromPotId: string;
  toPotId: string;
  fromAmountCents: number;
  idempotencyKey: string;
}

export interface ExecuteSwapResponse {
  swap: FXSwap;
}

export interface ListSwapsRequest {
  tenantId: string;
  potId?: string;
  limit?: number;
  cursor?: string;
}

export interface ListSwapsResponse {
  swaps: FXSwap[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ClosePotRequest {
  tenantId: string;
  potId: string;
  transferToPotId: string;
}

export interface GetSafeguardingRequest {
  tenantId: string;
  country?: string;
}

export interface GetSafeguardingResponse {
  safeguarding: SafeguardingInfo[];
}

export interface ListWithholdingRequest {
  tenantId: string;
  accountId?: string;
  year?: number;
  currency?: string;
}

export interface ListWithholdingResponse {
  entries: InterestWithholdingEntry[];
  totalGrossInterestCents: number;
  totalTaxWithheldCents: number;
  totalNetInterestCents: number;
}

export interface GetCarbonFootprintRequest {
  tenantId: string;
  transactionId: string;
}

export interface GetCarbonSummaryRequest {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface MultiCurrencyAdapter extends BaseAdapter {
  /** List all currency pots for the member */
  listPots(request: ListPotsRequest): Promise<ListPotsResponse>;

  /** Create a new currency pot */
  createPot(request: CreatePotRequest): Promise<CreatePotResponse>;

  /** Get a specific pot */
  getPot(request: GetPotRequest): Promise<CurrencyPot>;

  /** Generate a virtual IBAN for a pot */
  generateVIBAN(request: GenerateVIBANRequest): Promise<GenerateVIBANResponse>;

  /** Get a real-time FX swap quote */
  getSwapQuote(request: GetSwapQuoteRequest): Promise<FXSwapQuote>;

  /** Execute an FX swap between pots */
  executeSwap(request: ExecuteSwapRequest): Promise<ExecuteSwapResponse>;

  /** List swap history */
  listSwaps(request: ListSwapsRequest): Promise<ListSwapsResponse>;

  /** Close a pot (must transfer balance first) */
  closePot(request: ClosePotRequest): Promise<{ success: boolean }>;

  /** Get safeguarding / fund protection info */
  getSafeguarding(request: GetSafeguardingRequest): Promise<GetSafeguardingResponse>;

  /** List interest withholding tax entries */
  listWithholding(request: ListWithholdingRequest): Promise<ListWithholdingResponse>;

  /** Get carbon footprint for a transaction */
  getCarbonFootprint(request: GetCarbonFootprintRequest): Promise<CarbonFootprint>;

  /** Get carbon summary for a period */
  getCarbonSummary(request: GetCarbonSummaryRequest): Promise<CarbonSummary>;
}
