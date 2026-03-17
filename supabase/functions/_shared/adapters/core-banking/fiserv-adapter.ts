/**
 * Fiserv Banking Hub Core Banking Adapter
 *
 * Integrates with Fiserv's Banking Hub REST APIs — a unified abstraction layer
 * over Fiserv's core banking platforms: Premier, DNA, Signature, Cleartouch,
 * and Finxact. Fiserv covers nearly 40% of US financial institutions.
 *
 * API Documentation: https://developer.fiserv.com/product/BankingHub
 *
 * Banking Hub API Operations Used:
 *   - AcctInq:          POST /acctservice/acctmgmt/accounts/secured
 *   - PartyAcctRelInq:  POST /partyacctrelservice/partyacctrel/partyacctrel/secured
 *   - AcctTrnInq:       POST /acctservice/acctTrn/secured
 *   - XferAdd:          POST /xferservice/payments/transfers
 *
 * All Banking Hub APIs:
 *   - Use the EFX (Enterprise Financial eXchange) message standard
 *   - Require an EFXHeader with OrgId + TrnId in every request
 *   - Return responses wrapped in a Status envelope
 *   - Use POST for all operations (including reads)
 *
 * Authentication:
 *   OAuth 2.0 client_credentials grant. The access token is passed via
 *   Authorization: Bearer header. Tokens are cached until expiry.
 *   - Token endpoint: {baseUrl}/fts-apim/oauth2/v2 (cert env) or configured per workspace
 *   - Client ID and Secret are generated from the Fiserv Developer Studio workspace
 *
 * Configuration:
 *   FISERV_CLIENT_ID     — OAuth client ID from Developer Studio workspace
 *   FISERV_CLIENT_SECRET — OAuth client secret
 *   FISERV_BASE_URL      — API base URL (default: https://cert.api.fiservapps.com)
 *   FISERV_TOKEN_URL     — Token endpoint (default: {baseUrl}/fdobi/token)
 *   FISERV_ORG_ID        — Organization ID assigned by Fiserv workspace
 *   FISERV_PLATFORM      — 'premier' | 'dna' | 'signature' (default: 'premier')
 *   INSTITUTION_ROUTING_NUMBER — Institution ABA routing number
 *
 * Sandbox mode auto-enabled when credentials are not configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreAccountType,
  CoreAccountStatus,
  CoreTransaction,
  CoreTransactionType,
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
// TYPES — Fiserv Banking Hub EFX API shapes
// =============================================================================

/** EFX Header included in every Banking Hub request */
interface EFXHeader {
  OrganizationId: string;
  TrnId: string;
}

/** Status envelope returned by every Banking Hub response */
interface EFXStatus {
  StatusCode: string;
  StatusDesc?: string;
  Severity: 'Info' | 'Warning' | 'Error';
  SvcProviderName?: string;
}

/** Account keys used for identification throughout EFX */
interface AcctKeys {
  AcctId: string;
  AcctType: string; // DDA, SDA, CDA, MMA, LOAN, etc.
}

/** Balance entry within deposit account info */
interface AcctBal {
  BalType: string; // Avail, Ledger, Current, Hold, PendingBal, etc.
  CurAmt: { Amt: number; CurCode?: string };
}

/** Deposit account info returned by AcctInq */
interface DepositAcctInfo {
  AcctDtlStatus?: string;
  Desc?: string;
  Nickname?: string;
  AcctBal?: AcctBal[];
  Rate?: number;
  MaturityDt?: string;
  OpenDt?: string;
  ClosedDt?: string;
  PostAddr?: { Addr1?: string };
}

/** Single account record from AcctInq response */
interface AcctInqAcctRec {
  AcctKeys: AcctKeys;
  DepositAcctInfo?: DepositAcctInfo;
  AcctStatus?: { AcctStatusCode: string };
}

/** AcctInq response envelope */
interface AcctInqResponse {
  Status: EFXStatus;
  AcctRec?: AcctInqAcctRec;
}

/** Party-account relationship record from PartyAcctRelInq */
interface PartyAcctRelRec {
  PartyAcctRelKeys?: {
    AcctKeys: AcctKeys;
    PartyKeys?: { PartyId: string };
  };
  PartyAcctRelData?: {
    PartyAcctRelType?: string; // Owner, CoOwner, AuthSigner, etc.
  };
  AcctRef?: {
    AcctKeys: AcctKeys;
    AcctStatus?: { AcctStatusCode: string };
    DepositAcctInfo?: DepositAcctInfo;
  };
}

/** PartyAcctRelInq response envelope */
interface PartyAcctRelInqResponse {
  Status: EFXStatus;
  RecCtrlOut?: {
    SentRecCount: number;
    MatchedRec?: number;
    Cursor?: string;
  };
  PartyAcctRelRec?: PartyAcctRelRec[];
}

/** Transaction record from AcctTrnInq */
interface AcctTrnRec {
  AcctTrnKeys?: {
    AcctKeys: AcctKeys;
    AcctTrnIdent: string;
  };
  AcctTrnInfo?: {
    TrnType?: string;      // Debit, Credit
    TrnCode?: string;       // Detailed transaction code
    DrCrType?: string;      // Debit or Credit indicator
    TrnAmt?: { Amt: number; CurCode?: string };
    CompositeCurAmt?: { CurAmt: { Amt: number } };
    Desc?: string[];
    PostedDt?: string;
    EffDt?: string;
    ChkNum?: string;
    StmtRunningBal?: { Amt: number };
    MerchantData?: {
      MerchantName?: string;
      MerchantCatCode?: string;
    };
    Category?: string;
    Memo?: string;
  };
  AcctTrnStatus?: {
    AcctTrnStatusCode: string; // Posted, Pending, Reversed, etc.
  };
}

/** AcctTrnInq response envelope */
interface AcctTrnInqResponse {
  Status: EFXStatus;
  RecCtrlOut?: {
    SentRecCount: number;
    MatchedRec?: number;
    Cursor?: string;
  };
  AcctTrnRec?: AcctTrnRec[];
}

/** XferAdd response envelope */
interface XferAddResponse {
  Status: EFXStatus;
  XferStatusRec?: {
    XferKeys?: {
      XferId: string;
    };
    XferStatus?: {
      XferStatusCode: string; // Posted, Pending, etc.
      EffDt?: string;
    };
  };
}

/** OAuth token response */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapAcctType(acctType: string): CoreAccountType {
  const upper = (acctType || '').toUpperCase();
  if (upper === 'DDA') return 'checking';
  if (upper === 'SDA') return 'savings';
  if (upper === 'CDA') return 'cd';
  if (upper === 'MMA') return 'money_market';
  // Fallback for less common types
  if (upper.includes('CHECK') || upper.includes('DEMAND')) return 'checking';
  if (upper.includes('SAV')) return 'savings';
  if (upper.includes('CERT') || upper.includes('CD')) return 'cd';
  if (upper.includes('MONEY') || upper.includes('MMA')) return 'money_market';
  return 'savings';
}

function mapAcctStatus(statusCode: string): CoreAccountStatus {
  const upper = (statusCode || '').toUpperCase();
  if (upper === 'ACTIVE' || upper === 'OPEN') return 'active';
  if (upper === 'DORMANT' || upper === 'FROZEN' || upper === 'RESTRICTED') return 'frozen';
  if (upper === 'CLOSED') return 'closed';
  if (upper === 'PENDING' || upper === 'PENDINGOPEN') return 'pending';
  return 'active';
}

function mapTrnType(trnType: string, drCr: string, trnCode: string): CoreTransactionType {
  const code = (trnCode || '').toUpperCase();
  const type = (trnType || '').toUpperCase();
  // Check specific transaction codes first
  if (code.includes('XFER') || code.includes('TRANSFER')) return 'transfer';
  if (code.includes('DEP') || code.includes('DEPOSIT')) return 'deposit';
  if (code.includes('WTH') || code.includes('WITHDRAWAL')) return 'withdrawal';
  if (code.includes('FEE') || code.includes('SVCCHG') || code.includes('SERVICECHARGE')) return 'fee';
  if (code.includes('INT') || code.includes('DIVIDEND')) return 'interest';
  if (code.includes('BILLPAY') || code.includes('BILLPMT')) return 'bill_payment';
  if (code.includes('RDC') || code.includes('REMOTEDEP') || code.includes('MOBILEDEP')) return 'rdc_deposit';
  // Fall back to debit/credit based on DrCrType or TrnType
  const drCrUpper = (drCr || type).toUpperCase();
  if (drCrUpper === 'DEBIT' || drCrUpper === 'DR') return 'debit';
  return 'credit';
}

function mapTrnStatus(statusCode: string): 'pending' | 'posted' | 'declined' | 'reversed' {
  const upper = (statusCode || '').toUpperCase();
  if (upper === 'POSTED' || upper === 'CLEARED') return 'posted';
  if (upper === 'PENDING' || upper === 'MEMO') return 'pending';
  if (upper === 'DECLINED' || upper === 'REJECTED') return 'declined';
  if (upper === 'REVERSED' || upper === 'VOID' || upper === 'REVERSAL') return 'reversed';
  return 'posted';
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function maskAccountNumber(acctId: string): string {
  if (acctId.length <= 4) return `****${acctId}`;
  return `****${acctId.slice(-4)}`;
}

/**
 * Extract the balance amount for a given balance type from the EFX balance array.
 * Banking Hub returns multiple balance types: Avail, Ledger, Current, Hold, PendingBal.
 */
function extractBalance(balances: AcctBal[] | undefined, balType: string): number {
  if (!balances || balances.length === 0) return 0;
  const found = balances.find(b => b.BalType.toUpperCase() === balType.toUpperCase());
  return found ? found.CurAmt.Amt : (balances[0]?.CurAmt?.Amt ?? 0);
}

/**
 * Map the EFX AcctType code to the string expected by the Banking Hub API.
 * Used when building requests — e.g., determining which AcctType to query for.
 */
function coreTypeToEfxAcctType(type: CoreAccountType): string {
  switch (type) {
    case 'checking': return 'DDA';
    case 'savings': return 'SDA';
    case 'cd': return 'CDA';
    case 'money_market': return 'MMA';
    default: return 'DDA';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FiservCoreBankingAdapter implements CoreBankingAdapter {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private readonly orgId: string;
  private readonly platform: 'premier' | 'dna' | 'signature';
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  // OAuth token cache
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  readonly config: AdapterConfig = {
    id: 'fiserv',
    name: 'Fiserv Banking Hub (Premier / DNA / Signature)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.clientId = Deno.env.get('FISERV_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('FISERV_CLIENT_SECRET') ?? '';
    this.baseUrl = Deno.env.get('FISERV_BASE_URL') ?? 'https://cert.api.fiservapps.com';
    this.tokenUrl = Deno.env.get('FISERV_TOKEN_URL') ?? `${this.baseUrl}/fts-apim/oauth2/v2`;
    this.orgId = Deno.env.get('FISERV_ORG_ID') ?? '';
    this.platform = (Deno.env.get('FISERV_PLATFORM') ?? 'premier') as 'premier' | 'dna' | 'signature';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.clientId || !this.clientSecret;
  }

  // ---------------------------------------------------------------------------
  // OAuth 2.0 token management
  // ---------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Fiserv OAuth token request failed (${res.status}): ${errBody.slice(0, 500)}`);
    }

    const token = await res.json() as TokenResponse;
    this.accessToken = token.access_token;
    this.tokenExpiresAt = Date.now() + (token.expires_in * 1000);
    return this.accessToken;
  }

  // ---------------------------------------------------------------------------
  // HTTP client with OAuth + EFX Header
  // ---------------------------------------------------------------------------

  private buildEFXHeader(): EFXHeader {
    return {
      OrganizationId: this.orgId,
      TrnId: crypto.randomUUID(),
    };
  }

  private async apiRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
    if (this.sandbox) {
      throw new Error('Fiserv adapter in sandbox mode — credentials not configured');
    }

    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/banking/efx/v1${path}`;

    // Inject EFXHeader into the request body
    const payload = {
      ...body,
      EFXHeader: this.buildEFXHeader(),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Fiserv Banking Hub API error (${res.status}): ${errBody.slice(0, 500)}`);
    }

    return await res.json() as T;
  }

  private assertSuccess(status: EFXStatus, operation: string): void {
    if (status.Severity === 'Error') {
      throw new Error(
        `Fiserv ${operation} failed: [${status.StatusCode}] ${status.StatusDesc ?? 'Unknown error'}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode — no Fiserv credentials configured',
      };
    }

    try {
      // Validate we can obtain an OAuth token
      await this.getAccessToken();
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

  // ---------------------------------------------------------------------------
  // List accounts — PartyAcctRelInq
  //
  // Lists all accounts associated with a party (customer). The PartyAcctRelInq
  // operation returns account keys + relationship type for each account.
  // We then enrich with balance data from the AcctRef if available.
  // ---------------------------------------------------------------------------

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    const response = await this.apiRequest<PartyAcctRelInqResponse>(
      '/partyacctrelservice/partyacctrel/partyacctrel/secured',
      {
        PartyAcctRelSel: {
          PartyKeys: {
            PartyId: request.userId,
          },
        },
        RecCtrlIn: {
          MaxRecLimit: limit + offset,
        },
      },
    );

    this.assertSuccess(response.Status, 'PartyAcctRelInq');

    const relRecs = response.PartyAcctRelRec ?? [];

    // Map each relationship record to a CoreAccount
    const accounts: CoreAccount[] = relRecs
      .filter(rec => {
        // Only include deposit accounts (DDA, SDA, CDA, MMA), not loans
        const acctType = (rec.PartyAcctRelKeys?.AcctKeys?.AcctType ?? rec.AcctRef?.AcctKeys?.AcctType ?? '').toUpperCase();
        return ['DDA', 'SDA', 'CDA', 'MMA'].includes(acctType);
      })
      .map(rec => {
        const keys = rec.PartyAcctRelKeys?.AcctKeys ?? rec.AcctRef?.AcctKeys ?? { AcctId: '', AcctType: '' };
        const info = rec.AcctRef?.DepositAcctInfo;
        const statusCode = rec.AcctRef?.AcctStatus?.AcctStatusCode ?? 'Active';

        return {
          accountId: keys.AcctId,
          externalId: keys.AcctId,
          type: mapAcctType(keys.AcctType),
          nickname: info?.Nickname ?? info?.Desc ?? null,
          accountNumberMasked: maskAccountNumber(keys.AcctId),
          routingNumber: this.routingNumber,
          balanceCents: dollarsToCents(extractBalance(info?.AcctBal, 'Ledger')),
          availableBalanceCents: dollarsToCents(extractBalance(info?.AcctBal, 'Avail')),
          status: mapAcctStatus(statusCode),
          interestRateBps: Math.round((info?.Rate ?? 0) * 100),
          openedAt: info?.OpenDt ?? new Date().toISOString(),
          closedAt: info?.ClosedDt ?? null,
        };
      });

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: response.RecCtrlOut?.MatchedRec ?? accounts.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Get single account — AcctInq
  //
  // Uses AcctInq to get full deposit account details for a specific account.
  // AcctInq can return 1,300+ fields; we map the subset we need.
  // ---------------------------------------------------------------------------

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    // AcctInq requires both AcctId and AcctType. If we don't know the type,
    // try DDA first, then SDA. Most accounts are one of these two.
    const acctTypes = request.accountType
      ? [coreTypeToEfxAcctType(request.accountType as CoreAccountType)]
      : ['DDA', 'SDA', 'CDA', 'MMA'];

    let lastError: Error | null = null;

    for (const acctType of acctTypes) {
      try {
        const response = await this.apiRequest<AcctInqResponse>(
          '/acctservice/acctmgmt/accounts/secured',
          {
            AcctSel: {
              AcctKeys: {
                AcctId: request.accountId,
                AcctType: acctType,
              },
            },
          },
        );

        if (response.Status.Severity === 'Error') {
          lastError = new Error(response.Status.StatusDesc ?? response.Status.StatusCode);
          continue;
        }

        const rec = response.AcctRec;
        if (!rec) {
          lastError = new Error(`No account record returned for ${request.accountId}`);
          continue;
        }

        const keys = rec.AcctKeys;
        const info = rec.DepositAcctInfo;
        const statusCode = rec.AcctStatus?.AcctStatusCode ?? 'Active';

        return {
          accountId: keys.AcctId,
          externalId: keys.AcctId,
          type: mapAcctType(keys.AcctType),
          nickname: info?.Nickname ?? info?.Desc ?? null,
          accountNumberMasked: maskAccountNumber(keys.AcctId),
          routingNumber: this.routingNumber,
          balanceCents: dollarsToCents(extractBalance(info?.AcctBal, 'Ledger')),
          availableBalanceCents: dollarsToCents(extractBalance(info?.AcctBal, 'Avail')),
          status: mapAcctStatus(statusCode),
          interestRateBps: Math.round((info?.Rate ?? 0) * 100),
          openedAt: info?.OpenDt ?? new Date().toISOString(),
          closedAt: info?.ClosedDt ?? null,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }

    throw lastError ?? new Error(`Account ${request.accountId} not found`);
  }

  // ---------------------------------------------------------------------------
  // List transactions — AcctTrnInq
  //
  // Retrieves transaction history for a deposit account. Uses AcctTrnSel
  // with date range filtering and cursor-based pagination.
  // ---------------------------------------------------------------------------

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listTransactions(request);
    }

    if (!request.accountId) {
      return { transactions: [], total: 0 };
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    // Build AcctTrnSel selection criteria
    const acctTrnSel: Record<string, unknown> = {
      AcctKeys: {
        AcctId: request.accountId,
        AcctType: 'DDA', // Default; could be parameterized
      },
    };

    // Add date range if provided
    if (request.fromDate || request.toDate) {
      acctTrnSel.DtRange = {};
      if (request.fromDate) (acctTrnSel.DtRange as Record<string, string>).StartDt = request.fromDate;
      if (request.toDate) (acctTrnSel.DtRange as Record<string, string>).EndDt = request.toDate;
    }

    const response = await this.apiRequest<AcctTrnInqResponse>(
      '/acctservice/acctTrn/secured',
      {
        AcctTrnSel: acctTrnSel,
        RecCtrlIn: {
          MaxRecLimit: limit + offset,
        },
      },
    );

    this.assertSuccess(response.Status, 'AcctTrnInq');

    const trnRecs = response.AcctTrnRec ?? [];

    let transactions: CoreTransaction[] = trnRecs.map((rec: AcctTrnRec) => {
      const info = rec.AcctTrnInfo;
      const amtObj = info?.TrnAmt ?? info?.CompositeCurAmt?.CurAmt;
      const amountDollars = amtObj?.Amt ?? 0;
      const descriptions = info?.Desc ?? [];
      const description = descriptions.join(' ').trim() || info?.Memo || 'Transaction';

      return {
        transactionId: rec.AcctTrnKeys?.AcctTrnIdent ?? `fiserv-${Date.now()}-${Math.random()}`,
        accountId: rec.AcctTrnKeys?.AcctKeys?.AcctId ?? request.accountId!,
        type: mapTrnType(info?.TrnType ?? '', info?.DrCrType ?? '', info?.TrnCode ?? ''),
        amountCents: dollarsToCents(Math.abs(amountDollars)),
        description,
        category: info?.Category ?? null,
        status: mapTrnStatus(rec.AcctTrnStatus?.AcctTrnStatusCode ?? 'Posted'),
        merchantName: info?.MerchantData?.MerchantName ?? null,
        merchantCategory: info?.MerchantData?.MerchantCatCode ?? null,
        runningBalanceCents: info?.StmtRunningBal ? dollarsToCents(info.StmtRunningBal.Amt) : null,
        postedAt: info?.PostedDt ?? null,
        createdAt: info?.EffDt ?? info?.PostedDt ?? new Date().toISOString(),
      };
    });

    // Apply client-side filters for fields not natively supported by AcctTrnInq
    if (request.type) transactions = transactions.filter(t => t.type === request.type);
    if (request.status) transactions = transactions.filter(t => t.status === request.status);
    if (request.category) transactions = transactions.filter(t => t.category === request.category);
    if (request.search) {
      const q = request.search.toLowerCase();
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.merchantName && t.merchantName.toLowerCase().includes(q)),
      );
    }

    return {
      transactions: transactions.slice(offset, offset + limit),
      total: response.RecCtrlOut?.MatchedRec ?? transactions.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Create transfer — XferAdd
  //
  // Uses the Banking Hub Payments domain XferAdd operation to initiate an
  // internal transfer between accounts at the same institution.
  // ---------------------------------------------------------------------------

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    const { transfer } = request;
    const amountDollars = transfer.amountCents / 100;

    const xferInfo: Record<string, unknown> = {
      FromAcctRef: {
        AcctKeys: {
          AcctId: transfer.fromAccountId,
          AcctType: 'DDA', // Could be parameterized
        },
      },
      ToAcctRef: {
        AcctKeys: {
          AcctId: transfer.toAccountId ?? transfer.toBeneficiaryId,
          AcctType: 'DDA',
        },
      },
      CurAmt: {
        Amt: amountDollars,
      },
    };

    if (transfer.memo) {
      xferInfo.Desc = transfer.memo;
    }

    if (transfer.scheduledDate) {
      xferInfo.EffDt = transfer.scheduledDate;
    }

    const response = await this.apiRequest<XferAddResponse>(
      '/xferservice/payments/transfers',
      {
        XferInfo: xferInfo,
      },
    );

    this.assertSuccess(response.Status, 'XferAdd');

    const xferRec = response.XferStatusRec;
    const transferId = xferRec?.XferKeys?.XferId ?? `fiserv-${Date.now()}`;
    const xferStatus = (xferRec?.XferStatus?.XferStatusCode ?? '').toUpperCase();
    const status = xferStatus === 'POSTED' || xferStatus === 'COMPLETED' ? 'completed' : 'processing';

    return {
      transferId,
      status,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: xferRec?.XferStatus?.EffDt ?? (status === 'completed' ? new Date().toISOString() : null),
      createdAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Card management — not available through Banking Hub core APIs
  //
  // Card operations (lock/unlock, limits) require Fiserv's separate Card
  // Developer or Issuer Solutions APIs, which are distinct products from
  // the Banking Hub core banking APIs.
  // ---------------------------------------------------------------------------

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Fiserv Banking Hub — use Fiserv Card Developer / Issuer Solutions adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Fiserv Banking Hub — use Fiserv Card Developer / Issuer Solutions adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Fiserv Banking Hub — use Fiserv Card Developer / Issuer Solutions adapter');
  }
}
