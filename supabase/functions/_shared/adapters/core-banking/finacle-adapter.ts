// TODO: Provisional integration — not yet validated in production.
/**
 * Infosys Finacle Core Banking Adapter
 *
 * Integrates with Infosys Finacle — the dominant core banking platform in
 * India and APAC, serving 1B+ customers globally. Known for strong digital
 * transformation capabilities and AI-driven insights.
 *
 * Finacle exposes RESTful APIs and supports ISO 20022 for cross-border and
 * real-time payments via the Finacle Payments Hub.
 *
 * Configuration:
 *   FINACLE_BASE_URL      — Finacle API Gateway URL
 *   FINACLE_BANK_ID       — Bank/institution identifier
 *   FINACLE_API_KEY       — API key for authentication
 *   FINACLE_API_SECRET    — API secret
 *
 * ISO 20022 Integration:
 *   Finacle Payments Hub supports pain.001, pacs.008, pacs.002, camt.053
 *   with built-in message transformation and enrichment.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreAccountType,
  CoreAccountStatus,
  CoreTransaction,
  CoreTransferResult,
  CoreCard,
  ListAccountsRequest,
  ListAccountsResponse,
  GetAccountRequest,
  ListTransactionsRequest,
  ListTransactionsResponse,
  CreateTransferRequest,
  ListCardsRequest,
  ListCardsResponse,
  LockCardRequest,
  SetCardLimitRequest,
} from './types.ts';

// =============================================================================
// FINACLE API RESPONSE TYPES
// =============================================================================

interface FinacleAccount {
  acctId: string;
  cifId: string;
  acctType: string;
  schemeCode: string;
  acctName: string;
  currencyCode: string;
  clearedBal: number;
  availBal: number;
  acctStatus: string;
  rateOfInterest?: number;
  acctOpenDate: string;
  acctCloseDate?: string;
  branchCode: string;
}

interface FinacleTransaction {
  tranId: string;
  acctId: string;
  tranType: string;
  partTranType: 'C' | 'D';
  tranAmt: number;
  tranParticular: string;
  tranDate: string;
  valueDt: string;
  runningBal: number;
  tranStatus: string;
}

// =============================================================================
// TYPE MAPPING
// =============================================================================

function mapFinacleAccountType(schemeCode: string, acctType: string): CoreAccountType {
  const combined = `${schemeCode} ${acctType}`.toLowerCase();
  if (combined.includes('ca') || combined.includes('current') || combined.includes('checking')) return 'checking';
  if (combined.includes('sb') || combined.includes('sav')) return 'savings';
  if (combined.includes('mm') || combined.includes('money')) return 'money_market';
  if (combined.includes('td') || combined.includes('fd') || combined.includes('term') || combined.includes('fixed')) return 'cd';
  return 'savings';
}

function mapFinacleStatus(status: string): CoreAccountStatus {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'A': return 'active';
    case 'FROZEN':
    case 'INOPERATIVE':
    case 'F': return 'frozen';
    case 'CLOSED':
    case 'C': return 'closed';
    default: return 'pending';
  }
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function maskAccount(acctId: string): string {
  return `****${acctId.slice(-4)}`;
}

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class FinacleAdapter implements CoreBankingAdapter {
  readonly id = 'finacle';
  readonly name = 'Infosys Finacle';

  private config: AdapterConfig;
  private baseUrl: string;
  private bankId: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(config?: Partial<AdapterConfig>) {
    this.config = {
      id: 'finacle',
      name: 'Infosys Finacle',
      retry: config?.retry ?? DEFAULT_RETRY_CONFIG,
      timeout: config?.timeout ?? DEFAULT_TIMEOUT_CONFIG,
      circuitBreaker: config?.circuitBreaker ?? DEFAULT_CIRCUIT_BREAKER_CONFIG,
    };
    this.baseUrl = Deno.env.get('FINACLE_BASE_URL') ?? '';
    this.bankId = Deno.env.get('FINACLE_BANK_ID') ?? '';
    this.apiKey = Deno.env.get('FINACLE_API_KEY') ?? '';
    this.apiSecret = Deno.env.get('FINACLE_API_SECRET') ?? '';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'X-Api-Key': this.apiKey,
        'X-Api-Secret': this.apiSecret,
        'X-Bank-Id': this.bankId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Finacle API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  async listAccounts(req: ListAccountsRequest): Promise<ListAccountsResponse> {
    const params = new URLSearchParams();
    if (req.limit) params.set('pageSize', req.limit.toString());
    if (req.offset) params.set('pageNum', Math.floor(req.offset / (req.limit ?? 20)).toString());

    const data = await this.request<{ accountList: FinacleAccount[]; totalRecords?: number }>(
      `/api/v1/accounts?${params}`
    );

    const accounts: CoreAccount[] = (data.accountList ?? []).map((a) => ({
      accountId: a.acctId,
      externalId: a.cifId,
      type: mapFinacleAccountType(a.schemeCode, a.acctType),
      nickname: a.acctName || null,
      accountNumberMasked: maskAccount(a.acctId),
      routingNumber: a.branchCode,
      balanceCents: toCents(a.clearedBal),
      availableBalanceCents: toCents(a.availBal),
      status: mapFinacleStatus(a.acctStatus),
      interestRateBps: Math.round((a.rateOfInterest ?? 0) * 100),
      openedAt: a.acctOpenDate,
      closedAt: a.acctCloseDate ?? null,
    }));

    return { accounts, total: data.totalRecords ?? accounts.length };
  }

  async getAccount(req: GetAccountRequest): Promise<CoreAccount> {
    const data = await this.request<FinacleAccount>(
      `/api/v1/accounts/${req.accountId}`
    );

    return {
      accountId: data.acctId,
      externalId: data.cifId,
      type: mapFinacleAccountType(data.schemeCode, data.acctType),
      nickname: data.acctName || null,
      accountNumberMasked: maskAccount(data.acctId),
      routingNumber: data.branchCode,
      balanceCents: toCents(data.clearedBal),
      availableBalanceCents: toCents(data.availBal),
      status: mapFinacleStatus(data.acctStatus),
      interestRateBps: Math.round((data.rateOfInterest ?? 0) * 100),
      openedAt: data.acctOpenDate,
      closedAt: data.acctCloseDate ?? null,
    };
  }

  async listTransactions(req: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    const params = new URLSearchParams();
    if (req.accountId) params.set('acctId', req.accountId);
    if (req.fromDate) params.set('fromDate', req.fromDate);
    if (req.toDate) params.set('toDate', req.toDate);
    if (req.limit) params.set('pageSize', req.limit.toString());

    const data = await this.request<{ tranList: FinacleTransaction[]; totalRecords?: number }>(
      `/api/v1/transactions?${params}`
    );

    const transactions: CoreTransaction[] = (data.tranList ?? []).map((t) => ({
      transactionId: t.tranId,
      accountId: t.acctId,
      type: t.partTranType === 'C' ? 'credit' as const : 'debit' as const,
      amountCents: toCents(Math.abs(t.tranAmt)),
      description: t.tranParticular,
      category: null,
      status: t.tranStatus === 'SUCCESS' ? 'posted' as const : 'pending' as const,
      merchantName: null,
      merchantCategory: null,
      runningBalanceCents: toCents(t.runningBal),
      postedAt: t.tranDate,
      createdAt: t.tranDate,
    }));

    return { transactions, total: data.totalRecords ?? transactions.length };
  }

  async createTransfer(req: CreateTransferRequest): Promise<CoreTransferResult> {
    const body = {
      debitAcctId: req.transfer.fromAccountId,
      creditAcctId: req.transfer.toAccountId ?? req.transfer.toBeneficiaryId,
      tranAmt: req.transfer.amountCents / 100,
      currencyCode: 'USD',
      tranParticular: req.transfer.memo ?? 'Fund transfer',
      valueDt: req.transfer.scheduledDate ?? new Date().toISOString().slice(0, 10),
    };

    const data = await this.request<{ tranId: string; tranStatus: string }>(
      '/api/v1/transfers',
      { method: 'POST', body: JSON.stringify(body) }
    );

    return {
      transferId: data.tranId,
      status: data.tranStatus === 'SUCCESS' ? 'completed' : 'pending',
      fromAccountId: req.transfer.fromAccountId,
      toAccountId: req.transfer.toAccountId ?? null,
      amountCents: req.transfer.amountCents,
      processedAt: data.tranStatus === 'SUCCESS' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };
  }

  async listCards(_req: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_req: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card operations require a separate card management adapter');
  }

  async unlockCard(_req: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card operations require a separate card management adapter');
  }

  async setCardLimit(_req: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card operations require a separate card management adapter');
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        signal: controller.signal,
        headers: { 'X-Api-Key': this.apiKey, 'X-Bank-Id': this.bankId },
      });
      clearTimeout(timeout);
      return { healthy: response.ok, latencyMs: 0, message: response.ok ? 'OK' : `HTTP ${response.status}` };
    } catch (err) {
      return { healthy: false, latencyMs: 0, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
