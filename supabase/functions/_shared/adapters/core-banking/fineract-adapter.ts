/**
 * Apache Fineract Core Banking Adapter
 *
 * Integrates with Apache Fineract — a mature, open-source core banking platform
 * used by financial institutions worldwide, and the standard for financial
 * inclusion in India, Nigeria, Kenya, and across Africa.
 *
 * Supports the full Fineract product suite:
 *   - Savings accounts (checking, savings, money market)
 *   - Fixed deposits (certificates of deposit / term deposits)
 *   - Recurring deposits
 *   - Share accounts (cooperative/credit union shares)
 *   - Loan accounts (individual and group/JLG microfinance)
 *   - Multi-currency (INR, KES, NGN, UGX, TZS, GHS, ZAR, USD, etc.)
 *   - Group/center lending (Mifos group-based methodology)
 *
 * Apache Fineract API: https://fineract.apache.org/
 * Mifos Initiative: https://mifos.org/
 *
 * Configuration:
 *   FINERACT_BASE_URL — Base URL (e.g., https://fineract.example.com/fineract-provider/api/v1)
 *   FINERACT_TENANT_ID — Fineract tenant identifier
 *   FINERACT_USERNAME — API username
 *   FINERACT_PASSWORD — API password
 *
 * Sandbox mode auto-enabled when no credentials are configured.
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
// FINERACT API RESPONSE TYPES
// =============================================================================

interface FineractSavingsAccount {
  id: number;
  accountNo: string;
  externalId?: string;
  clientId: number;
  productName: string;
  shortProductName: string;
  status: { id: number; code: string; value: string };
  currency: { code: string; decimalPlaces: number };
  nominalAnnualInterestRate: number;
  summary?: {
    accountBalance: number;
    availableBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
  };
  activatedOnDate?: number[];
  closedOnDate?: number[];
}

interface FineractFixedDepositAccount {
  id: number;
  accountNo: string;
  externalId?: string;
  clientId: number;
  productName: string;
  shortProductName: string;
  status: { id: number; code: string; value: string };
  currency: { code: string; decimalPlaces: number };
  nominalAnnualInterestRate: number;
  depositAmount: number;
  maturityAmount?: number;
  maturityDate?: number[];
  depositPeriod?: number;
  depositPeriodFrequency?: { id: number; code: string; value: string };
  summary?: {
    accountBalance: number;
    totalDeposits: number;
    totalInterestEarned: number;
  };
  activatedOnDate?: number[];
  closedOnDate?: number[];
}

interface FineractRecurringDepositAccount {
  id: number;
  accountNo: string;
  externalId?: string;
  clientId: number;
  productName: string;
  shortProductName: string;
  status: { id: number; code: string; value: string };
  currency: { code: string; decimalPlaces: number };
  nominalAnnualInterestRate: number;
  mandatoryRecommendedDepositAmount: number;
  depositPeriod?: number;
  depositPeriodFrequency?: { id: number; code: string; value: string };
  recurringDepositFrequency?: number;
  recurringDepositFrequencyType?: { id: number; code: string; value: string };
  summary?: {
    accountBalance: number;
    totalDeposits: number;
    totalInterestEarned: number;
  };
  activatedOnDate?: number[];
  closedOnDate?: number[];
}

interface FineractShareAccount {
  id: number;
  accountNo: string;
  externalId?: string;
  clientId: number;
  productName: string;
  shortProductName: string;
  status: { id: number; code: string; value: string };
  currency: { code: string; decimalPlaces: number };
  totalApprovedShares: number;
  totalPendingForApprovalShares: number;
  unitPrice: number;
  activatedDate?: number[];
  closedDate?: number[];
}

interface FineractLoanAccount {
  id: number;
  accountNo: string;
  externalId?: string;
  clientId: number;
  groupId?: number;
  productName: string;
  shortProductName: string;
  status: { id: number; code: string; value: string };
  currency: { code: string; decimalPlaces: number };
  principal: number;
  annualInterestRate: number;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: { id: number; code: string; value: string };
  loanType: { id: number; code: string; value: string };
  summary?: {
    principalDisbursed: number;
    principalPaid: number;
    principalOutstanding: number;
    interestCharged: number;
    interestPaid: number;
    interestOutstanding: number;
    totalExpectedRepayment: number;
    totalRepayment: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  timeline?: {
    submittedOnDate: number[];
    approvedOnDate?: number[];
    expectedDisbursementDate?: number[];
    actualDisbursementDate?: number[];
    expectedMaturityDate?: number[];
    closedOnDate?: number[];
  };
}

interface FineractTransaction {
  id: number;
  transactionType: { id: number; code: string; value: string };
  amount: number;
  date: number[];
  runningBalance?: number;
  submittedOnDate: number[];
  reversed: boolean;
}

interface FineractLoanTransaction {
  id: number;
  type: { id: number; code: string; value: string };
  amount: number;
  date: number[];
  principalPortion: number;
  interestPortion: number;
  feeChargesPortion: number;
  penaltyChargesPortion: number;
  outstandingLoanBalance: number;
  submittedOnDate: number[];
  reversed: boolean;
}

interface FineractClientAccounts {
  savingsAccounts?: FineractSavingsAccount[];
  loanAccounts?: FineractLoanAccount[];
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return `****${accountNo}`;
  return `****${accountNo.slice(-4)}`;
}

function fineractDateToISO(dateArr: number[]): string {
  const [y, m, d] = dateArr;
  return new Date(y, m - 1, d).toISOString();
}

function toCents(amount: number, decimalPlaces: number): number {
  const multiplier = Math.pow(10, 2 - decimalPlaces);
  return Math.round(amount * multiplier);
}

function mapFineractAccountType(productName: string): CoreAccountType {
  const lower = productName.toLowerCase();
  if (lower.includes('checking') || lower.includes('current')) return 'checking';
  if (lower.includes('money market') || lower.includes('mm')) return 'money_market';
  if (lower.includes('cd') || lower.includes('certificate')) return 'cd';
  if (lower.includes('fixed') || lower.includes('term deposit')) return 'fixed_deposit';
  if (lower.includes('recurring')) return 'recurring_deposit';
  if (lower.includes('share')) return 'share';
  if (lower.includes('loan') || lower.includes('micro') || lower.includes('jlg') || lower.includes('group loan')) return 'loan';
  return 'savings';
}

function mapFineractAccountStatus(code: string): CoreAccountStatus {
  const lower = code.toLowerCase();
  if (lower.includes('active') || lower.includes('approved.and.active')) return 'active';
  if (lower.includes('approved') || lower.includes('pending')) return 'pending';
  if (lower.includes('closed') || lower.includes('matured') || lower.includes('withdrawn')) return 'closed';
  if (lower.includes('rejected') || lower.includes('premature')) return 'closed';
  if (lower.includes('submitted') || lower.includes('pendingapproval')) return 'pending';
  return 'active';
}

function mapFineractLoanStatus(code: string): CoreAccountStatus {
  const lower = code.toLowerCase();
  if (lower.includes('active') || lower.includes('approved')) return 'active';
  if (lower.includes('pending') || lower.includes('submitted') || lower.includes('waiting')) return 'pending';
  if (lower.includes('closed') || lower.includes('withdrawn') || lower.includes('rejected')) return 'closed';
  if (lower.includes('overpaid') || lower.includes('written')) return 'frozen';
  return 'active';
}

function mapFineractAccount(fa: FineractSavingsAccount, routingNumber: string): CoreAccount {
  const multiplier = Math.pow(10, 2 - fa.currency.decimalPlaces);
  return {
    accountId: String(fa.id),
    externalId: fa.externalId,
    type: mapFineractAccountType(fa.productName),
    nickname: fa.shortProductName || fa.productName,
    accountNumberMasked: maskAccountNumber(fa.accountNo),
    routingNumber,
    balanceCents: Math.round((fa.summary?.accountBalance ?? 0) * multiplier),
    availableBalanceCents: Math.round((fa.summary?.availableBalance ?? 0) * multiplier),
    status: mapFineractAccountStatus(fa.status.code),
    interestRateBps: Math.round(fa.nominalAnnualInterestRate * 100),
    openedAt: fa.activatedOnDate ? fineractDateToISO(fa.activatedOnDate) : new Date().toISOString(),
    closedAt: fa.closedOnDate ? fineractDateToISO(fa.closedOnDate) : null,
  };
}

function mapFixedDepositAccount(fd: FineractFixedDepositAccount, routingNumber: string): CoreAccount {
  const cents = toCents(fd.summary?.accountBalance ?? fd.depositAmount ?? 0, fd.currency.decimalPlaces);
  return {
    accountId: String(fd.id),
    externalId: fd.externalId,
    type: 'fixed_deposit',
    nickname: fd.shortProductName || fd.productName,
    accountNumberMasked: maskAccountNumber(fd.accountNo),
    routingNumber,
    balanceCents: cents,
    availableBalanceCents: 0, // Fixed deposits are not withdrawable until maturity
    status: mapFineractAccountStatus(fd.status.code),
    interestRateBps: Math.round(fd.nominalAnnualInterestRate * 100),
    openedAt: fd.activatedOnDate ? fineractDateToISO(fd.activatedOnDate) : new Date().toISOString(),
    closedAt: fd.closedOnDate ? fineractDateToISO(fd.closedOnDate) : null,
  };
}

function mapRecurringDepositAccount(rd: FineractRecurringDepositAccount, routingNumber: string): CoreAccount {
  const cents = toCents(rd.summary?.accountBalance ?? 0, rd.currency.decimalPlaces);
  return {
    accountId: String(rd.id),
    externalId: rd.externalId,
    type: 'recurring_deposit',
    nickname: rd.shortProductName || rd.productName,
    accountNumberMasked: maskAccountNumber(rd.accountNo),
    routingNumber,
    balanceCents: cents,
    availableBalanceCents: 0, // Recurring deposits are not freely withdrawable
    status: mapFineractAccountStatus(rd.status.code),
    interestRateBps: Math.round(rd.nominalAnnualInterestRate * 100),
    openedAt: rd.activatedOnDate ? fineractDateToISO(rd.activatedOnDate) : new Date().toISOString(),
    closedAt: rd.closedOnDate ? fineractDateToISO(rd.closedOnDate) : null,
  };
}

function mapShareAccount(sa: FineractShareAccount, routingNumber: string): CoreAccount {
  const totalValueCents = toCents(sa.totalApprovedShares * sa.unitPrice, sa.currency.decimalPlaces);
  return {
    accountId: String(sa.id),
    externalId: sa.externalId,
    type: 'share',
    nickname: sa.shortProductName || sa.productName,
    accountNumberMasked: maskAccountNumber(sa.accountNo),
    routingNumber,
    balanceCents: totalValueCents,
    availableBalanceCents: totalValueCents,
    status: mapFineractAccountStatus(sa.status.code),
    interestRateBps: 0, // Shares earn dividends, not interest
    openedAt: sa.activatedDate ? fineractDateToISO(sa.activatedDate) : new Date().toISOString(),
    closedAt: sa.closedDate ? fineractDateToISO(sa.closedDate) : null,
  };
}

function mapLoanAccount(la: FineractLoanAccount, routingNumber: string): CoreAccount {
  const multiplier = Math.pow(10, 2 - la.currency.decimalPlaces);
  const outstandingCents = Math.round((la.summary?.totalOutstanding ?? la.principal) * multiplier);
  return {
    accountId: String(la.id),
    externalId: la.externalId,
    type: 'loan',
    nickname: la.shortProductName || la.productName,
    accountNumberMasked: maskAccountNumber(la.accountNo),
    routingNumber,
    balanceCents: -outstandingCents, // Loan balances are negative (owed)
    availableBalanceCents: 0,
    status: mapFineractLoanStatus(la.status.code),
    interestRateBps: Math.round(la.annualInterestRate * 100),
    openedAt: la.timeline?.actualDisbursementDate
      ? fineractDateToISO(la.timeline.actualDisbursementDate)
      : la.timeline?.submittedOnDate
        ? fineractDateToISO(la.timeline.submittedOnDate)
        : new Date().toISOString(),
    closedAt: la.timeline?.closedOnDate ? fineractDateToISO(la.timeline.closedOnDate) : null,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FineractCoreBankingAdapter implements CoreBankingAdapter {
  protected readonly baseUrl: string;
  protected readonly tenantIdentifier: string;
  protected readonly username: string;
  protected readonly password: string;
  protected readonly routingNumber: string;
  protected readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'fineract',
    name: 'Apache Fineract Core Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('FINERACT_BASE_URL') ?? '';
    this.tenantIdentifier = Deno.env.get('FINERACT_TENANT_ID') ?? 'default';
    this.username = Deno.env.get('FINERACT_USERNAME') ?? '';
    this.password = Deno.env.get('FINERACT_PASSWORD') ?? '';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.baseUrl || !this.username;
  }

  protected async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Fineract adapter in sandbox mode — credentials not configured');
    }

    const authHeader = btoa(`${this.username}:${this.password}`);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Fineract-Platform-TenantId': this.tenantIdentifier,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Fineract API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode',
      };
    }

    try {
      await this.request('GET', '/authentication');
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  /**
   * Resolve Fineract clientId from the platform userId via external ID lookup.
   */
  protected async resolveClientId(userId: string): Promise<number | null> {
    const clients = await this.request<{ pageItems: Array<{ id: number }> }>(
      'GET',
      `/clients?externalId=${userId}&limit=1`,
    );
    return clients.pageItems.length > 0 ? clients.pageItems[0].id : null;
  }

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    const clientId = await this.resolveClientId(request.userId);
    if (!clientId) {
      return { accounts: [], total: 0 };
    }

    // Fetch all account types from Fineract in parallel
    const [clientAccounts, fixedDeposits, recurringDeposits, shareAccounts] = await Promise.all([
      this.request<FineractClientAccounts>(
        'GET',
        `/clients/${clientId}/accounts?fields=savingsAccounts,loanAccounts`,
      ).catch(() => ({ savingsAccounts: [], loanAccounts: [] } as FineractClientAccounts)),

      this.request<{ pageItems?: FineractFixedDepositAccount[] }>(
        'GET',
        `/fixeddepositaccounts?clientId=${clientId}&limit=100`,
      ).catch(() => ({ pageItems: [] })),

      this.request<{ pageItems?: FineractRecurringDepositAccount[] }>(
        'GET',
        `/recurringdepositaccounts?clientId=${clientId}&limit=100`,
      ).catch(() => ({ pageItems: [] })),

      this.request<{ pageItems?: FineractShareAccount[] }>(
        'GET',
        `/accounts/share?clientId=${clientId}&limit=100`,
      ).catch(() => ({ pageItems: [] })),
    ]);

    const accounts: CoreAccount[] = [];

    // Savings accounts (checking, savings, money market)
    for (const sa of clientAccounts.savingsAccounts ?? []) {
      accounts.push(mapFineractAccount(sa, this.routingNumber));
    }

    // Loan accounts (individual + group/JLG)
    for (const la of clientAccounts.loanAccounts ?? []) {
      accounts.push(mapLoanAccount(la, this.routingNumber));
    }

    // Fixed deposits
    for (const fd of fixedDeposits.pageItems ?? []) {
      accounts.push(mapFixedDepositAccount(fd, this.routingNumber));
    }

    // Recurring deposits
    for (const rd of recurringDeposits.pageItems ?? []) {
      accounts.push(mapRecurringDepositAccount(rd, this.routingNumber));
    }

    // Share accounts (cooperative shares)
    for (const sa of shareAccounts.pageItems ?? []) {
      accounts.push(mapShareAccount(sa, this.routingNumber));
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    // Try savings account first (most common)
    try {
      const fa = await this.request<FineractSavingsAccount>(
        'GET',
        `/savingsaccounts/${request.accountId}?associations=summary`,
      );
      return mapFineractAccount(fa, this.routingNumber);
    } catch {
      // Not a savings account — try other types
    }

    // Try loan account
    try {
      const la = await this.request<FineractLoanAccount>(
        'GET',
        `/loans/${request.accountId}?associations=all`,
      );
      return mapLoanAccount(la, this.routingNumber);
    } catch {
      // Not a loan
    }

    // Try fixed deposit
    try {
      const fd = await this.request<FineractFixedDepositAccount>(
        'GET',
        `/fixeddepositaccounts/${request.accountId}?associations=all`,
      );
      return mapFixedDepositAccount(fd, this.routingNumber);
    } catch {
      // Not a fixed deposit
    }

    // Try recurring deposit
    try {
      const rd = await this.request<FineractRecurringDepositAccount>(
        'GET',
        `/recurringdepositaccounts/${request.accountId}?associations=all`,
      );
      return mapRecurringDepositAccount(rd, this.routingNumber);
    } catch {
      // Not a recurring deposit
    }

    // Try share account
    const sa = await this.request<FineractShareAccount>(
      'GET',
      `/accounts/share/${request.accountId}`,
    );
    return mapShareAccount(sa, this.routingNumber);
  }

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listTransactions(request);
    }

    const accountId = request.accountId;
    if (!accountId) {
      return { transactions: [], total: 0 };
    }

    // Try savings/deposit transactions first, then loan repayments
    try {
      const response = await this.request<{ transactions: FineractTransaction[] }>(
        'GET',
        `/savingsaccounts/${accountId}/transactions?limit=${request.limit ?? 50}&offset=${request.offset ?? 0}`,
      );

      const transactions: CoreTransaction[] = (response.transactions ?? []).map(t => ({
        transactionId: String(t.id),
        accountId,
        type: mapSavingsTransactionType(t.transactionType.code),
        amountCents: Math.round(t.amount * 100),
        description: t.transactionType.value,
        category: null,
        status: t.reversed ? 'reversed' as const : 'posted' as const,
        merchantName: null,
        merchantCategory: null,
        runningBalanceCents: t.runningBalance != null ? Math.round(t.runningBalance * 100) : null,
        postedAt: fineractDateToISO(t.date),
        createdAt: fineractDateToISO(t.submittedOnDate),
      }));

      return { transactions, total: transactions.length };
    } catch {
      // Not a savings account — try loan transactions
    }

    try {
      const response = await this.request<{ transactions: FineractLoanTransaction[] }>(
        'GET',
        `/loans/${accountId}/transactions`,
      );

      const transactions: CoreTransaction[] = (response.transactions ?? []).map(t => ({
        transactionId: String(t.id),
        accountId,
        type: mapLoanTransactionType(t.type.code),
        amountCents: Math.round(t.amount * 100),
        description: t.type.value,
        category: null,
        status: t.reversed ? 'reversed' as const : 'posted' as const,
        merchantName: null,
        merchantCategory: null,
        runningBalanceCents: Math.round(t.outstandingLoanBalance * 100),
        postedAt: fineractDateToISO(t.date),
        createdAt: fineractDateToISO(t.submittedOnDate),
      }));

      return { transactions, total: transactions.length };
    } catch {
      return { transactions: [], total: 0 };
    }
  }

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    const { transfer } = request;
    const today = new Date();
    const dateStr = `${today.getDate()} ${['January','February','March','April','May','June','July','August','September','October','November','December'][today.getMonth()]} ${today.getFullYear()}`;

    // Fineract account transfer
    const response = await this.request<{ savingsId: number; resourceId: number }>(
      'POST',
      '/accounttransfers',
      {
        fromOfficeId: 1,
        fromClientId: request.userId,
        fromAccountType: 2, // savings
        fromAccountId: transfer.fromAccountId,
        toOfficeId: 1,
        toClientId: request.userId,
        toAccountType: 2,
        toAccountId: transfer.toAccountId,
        transferAmount: transfer.amountCents / 100,
        transferDate: dateStr,
        transferDescription: transfer.memo ?? 'Transfer',
        dateFormat: 'dd MMMM yyyy',
        locale: 'en',
      },
    );

    return {
      transferId: String(response.resourceId),
      status: 'pending',
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    // Fineract does not natively support card management.
    // Cards are managed through a separate card processor adapter.
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Fineract — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Fineract — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Fineract — use card domain adapter');
  }
}

// =============================================================================
// TRANSACTION TYPE MAPPING
// =============================================================================

function mapSavingsTransactionType(code: string): 'debit' | 'credit' | 'transfer' | 'deposit' | 'withdrawal' | 'fee' | 'interest' {
  const lower = code.toLowerCase();
  if (lower.includes('withdrawal')) return 'withdrawal';
  if (lower.includes('deposit')) return 'deposit';
  if (lower.includes('interest')) return 'interest';
  if (lower.includes('fee') || lower.includes('charge')) return 'fee';
  if (lower.includes('transfer')) return 'transfer';
  if (lower.includes('debit')) return 'debit';
  return 'credit';
}

function mapLoanTransactionType(code: string): 'debit' | 'credit' | 'fee' | 'interest' {
  const lower = code.toLowerCase();
  if (lower.includes('disbursement')) return 'credit';
  if (lower.includes('repayment')) return 'debit';
  if (lower.includes('fee') || lower.includes('charge') || lower.includes('penalty')) return 'fee';
  if (lower.includes('interest') || lower.includes('waiver')) return 'interest';
  return 'debit';
}
