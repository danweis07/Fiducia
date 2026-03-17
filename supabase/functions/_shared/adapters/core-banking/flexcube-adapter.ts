// TODO: Provisional integration — not yet validated in production.
/**
 * Oracle FLEXCUBE Universal Banking Adapter
 *
 * Integrates with Oracle FLEXCUBE — widely deployed in India, Middle East,
 * and Africa for complex multi-currency and multi-entity banking operations.
 *
 * FLEXCUBE exposes RESTful APIs via Oracle API Gateway and supports
 * ISO 20022 natively for cross-border payment messaging.
 *
 * Configuration:
 *   FLEXCUBE_BASE_URL     — FLEXCUBE API Gateway URL
 *   FLEXCUBE_BRANCH_CODE  — Default branch code
 *   FLEXCUBE_USERNAME     — API username
 *   FLEXCUBE_PASSWORD     — API password
 *
 * ISO 20022 Integration:
 *   FLEXCUBE supports pain.001 (credit initiation), pacs.008 (FI-to-FI transfers),
 *   camt.053/camt.054 (statements and notifications) via its payment hub.
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
// FLEXCUBE API RESPONSE TYPES
// =============================================================================

interface FlexcubeAccount {
  ACCOUNT_NO: string;
  CUST_NO: string;
  CCY: string;
  ACCOUNT_CLASS: string;
  BRANCH_CODE: string;
  CURRENT_BAL: number;
  AVAILABLE_BAL: number;
  IBAN?: string;
  STATUS: string;
  INT_RATE?: number;
  OPEN_DATE: string;
  CLOSE_DATE?: string;
}

interface FlexcubeTransaction {
  TRN_REF_NO: string;
  AC_NO: string;
  TRN_CODE: string;
  TRN_TYPE: 'C' | 'D';
  AMOUNT: number;
  NARRATIVE: string;
  VALUE_DATE: string;
  BOOKING_DATE: string;
  BALANCE: number;
}

// =============================================================================
// TYPE MAPPING
// =============================================================================

function mapFlexcubeAccountType(accountClass: string): CoreAccountType {
  const lower = accountClass.toLowerCase();
  if (lower.includes('casa') || lower.includes('current') || lower.includes('checking')) return 'checking';
  if (lower.includes('sav')) return 'savings';
  if (lower.includes('mm') || lower.includes('money')) return 'money_market';
  if (lower.includes('td') || lower.includes('term') || lower.includes('fixed')) return 'cd';
  return 'savings';
}

function mapFlexcubeStatus(status: string): CoreAccountStatus {
  switch (status.toUpperCase()) {
    case 'A':
    case 'ACTIVE': return 'active';
    case 'F':
    case 'FROZEN': return 'frozen';
    case 'C':
    case 'CLOSED': return 'closed';
    default: return 'pending';
  }
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function maskAccount(accountNo: string): string {
  return `****${accountNo.slice(-4)}`;
}

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class FlexcubeAdapter implements CoreBankingAdapter {
  readonly id = 'flexcube';
  readonly name = 'Oracle FLEXCUBE';

  private config: AdapterConfig;
  private baseUrl: string;
  private branchCode: string;
  private username: string;
  private password: string;

  constructor(config?: Partial<AdapterConfig>) {
    this.config = {
      id: 'flexcube',
      name: 'Oracle FLEXCUBE',
      retry: config?.retry ?? DEFAULT_RETRY_CONFIG,
      timeout: config?.timeout ?? DEFAULT_TIMEOUT_CONFIG,
      circuitBreaker: config?.circuitBreaker ?? DEFAULT_CIRCUIT_BREAKER_CONFIG,
    };
    this.baseUrl = Deno.env.get('FLEXCUBE_BASE_URL') ?? '';
    this.branchCode = Deno.env.get('FLEXCUBE_BRANCH_CODE') ?? '000';
    this.username = Deno.env.get('FLEXCUBE_USERNAME') ?? '';
    this.password = Deno.env.get('FLEXCUBE_PASSWORD') ?? '';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const authHeader = 'Basic ' + btoa(`${this.username}:${this.password}`);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`FLEXCUBE API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  async listAccounts(_req: ListAccountsRequest): Promise<ListAccountsResponse> {
    const data = await this.request<{ accounts: FlexcubeAccount[]; totalCount?: number }>(
      `/api/v1/accounts?branchCode=${this.branchCode}`
    );

    const accounts: CoreAccount[] = (data.accounts ?? []).map((a) => ({
      accountId: a.ACCOUNT_NO,
      externalId: a.CUST_NO,
      type: mapFlexcubeAccountType(a.ACCOUNT_CLASS),
      nickname: null,
      accountNumberMasked: a.IBAN ? maskAccount(a.IBAN) : maskAccount(a.ACCOUNT_NO),
      routingNumber: a.BRANCH_CODE,
      balanceCents: toCents(a.CURRENT_BAL),
      availableBalanceCents: toCents(a.AVAILABLE_BAL),
      status: mapFlexcubeStatus(a.STATUS),
      interestRateBps: Math.round((a.INT_RATE ?? 0) * 100),
      openedAt: a.OPEN_DATE,
      closedAt: a.CLOSE_DATE ?? null,
    }));

    return { accounts, total: data.totalCount ?? accounts.length };
  }

  async getAccount(req: GetAccountRequest): Promise<CoreAccount> {
    const data = await this.request<FlexcubeAccount>(
      `/api/v1/accounts/${req.accountId}`
    );

    return {
      accountId: data.ACCOUNT_NO,
      externalId: data.CUST_NO,
      type: mapFlexcubeAccountType(data.ACCOUNT_CLASS),
      nickname: null,
      accountNumberMasked: data.IBAN ? maskAccount(data.IBAN) : maskAccount(data.ACCOUNT_NO),
      routingNumber: data.BRANCH_CODE,
      balanceCents: toCents(data.CURRENT_BAL),
      availableBalanceCents: toCents(data.AVAILABLE_BAL),
      status: mapFlexcubeStatus(data.STATUS),
      interestRateBps: Math.round((data.INT_RATE ?? 0) * 100),
      openedAt: data.OPEN_DATE,
      closedAt: data.CLOSE_DATE ?? null,
    };
  }

  async listTransactions(req: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    const params = new URLSearchParams();
    if (req.accountId) params.set('accountNo', req.accountId);
    if (req.fromDate) params.set('fromDate', req.fromDate);
    if (req.toDate) params.set('toDate', req.toDate);

    const data = await this.request<{ transactions: FlexcubeTransaction[]; totalCount?: number }>(
      `/api/v1/transactions?${params}`
    );

    const transactions: CoreTransaction[] = (data.transactions ?? []).map((t) => ({
      transactionId: t.TRN_REF_NO,
      accountId: t.AC_NO,
      type: t.TRN_TYPE === 'C' ? 'credit' as const : 'debit' as const,
      amountCents: toCents(Math.abs(t.AMOUNT)),
      description: t.NARRATIVE,
      category: null,
      status: 'posted' as const,
      merchantName: null,
      merchantCategory: null,
      runningBalanceCents: toCents(t.BALANCE),
      postedAt: t.BOOKING_DATE,
      createdAt: t.BOOKING_DATE,
    }));

    return { transactions, total: data.totalCount ?? transactions.length };
  }

  async createTransfer(req: CreateTransferRequest): Promise<CoreTransferResult> {
    const body = {
      DEBIT_AC_NO: req.transfer.fromAccountId,
      CREDIT_AC_NO: req.transfer.toAccountId ?? req.transfer.toBeneficiaryId,
      TRN_AMOUNT: req.transfer.amountCents / 100,
      CCY: 'USD',
      NARRATIVE: req.transfer.memo ?? '',
      VALUE_DATE: req.transfer.scheduledDate ?? new Date().toISOString().slice(0, 10),
      BRANCH_CODE: this.branchCode,
    };

    const data = await this.request<{ TRN_REF_NO: string; STATUS: string }>(
      '/api/v1/transfers',
      { method: 'POST', body: JSON.stringify(body) }
    );

    return {
      transferId: data.TRN_REF_NO,
      status: data.STATUS === 'PROCESSED' ? 'completed' : 'pending',
      fromAccountId: req.transfer.fromAccountId,
      toAccountId: req.transfer.toAccountId ?? null,
      amountCents: req.transfer.amountCents,
      processedAt: data.STATUS === 'PROCESSED' ? new Date().toISOString() : null,
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
      });
      clearTimeout(timeout);
      return { healthy: response.ok, latencyMs: 0, message: response.ok ? 'OK' : `HTTP ${response.status}` };
    } catch (err) {
      return { healthy: false, latencyMs: 0, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
