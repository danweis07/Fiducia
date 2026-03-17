// TODO: Provisional integration — not yet validated in production.
/**
 * Symitar SymXchange Core Banking Adapter
 *
 * Integrates with Jack Henry's Symitar core banking system via the
 * SymXchange SOAP/XML web services API. Symitar powers 800+ credit
 * unions and is the most widely deployed CU core in the United States.
 *
 * SymXchange uses SOAP 1.1 over HTTP with WSDL-defined services:
 *   - UserManagement: logon/logoff for token-based auth
 *   - AccountService: getAccount, getAccountSelectFields
 *   - TransactionsService: transfer, deposit, withdrawal
 *   - CRUD services: create, read, update, delete on records
 *   - PowerOn: execute specfiles
 *
 * Authentication flow:
 *   1. Logon with UserNumber + Password → receive TokenId
 *   2. Use TokenId in subsequent requests (15-min expiry)
 *   3. Logoff to invalidate token
 *
 * Configuration:
 *   SYMITAR_HOST — SymXchange hostname (e.g., symxchange.example.com)
 *   SYMITAR_PORT — SymXchange port (default: 443)
 *   SYMITAR_USER_NUMBER — Symitar user number for authentication
 *   SYMITAR_PASSWORD — Symitar user password
 *   SYMITAR_DEVICE_TYPE — Device type (default: CLIENTSYSTEM)
 *   SYMITAR_DEVICE_NUMBER — Device number (default: 20000)
 *   INSTITUTION_ROUTING_NUMBER — Institution ABA routing number
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
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
// SOAP XML HELPERS
// =============================================================================

const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
const ACCOUNT_NS = 'http://www.symxchange.generated.symitar.com/v2/account';
const COMMON_NS = 'http://www.symxchange.generated.symitar.com/v1/common/dto/common';
const USER_NS = 'http://www.symxchange.generated.symitar.com/v1/usermanagement';
const TRANS_NS = 'http://www.symxchange.generated.symitar.com/v1/transactions';
const TRANS_DTO_NS = 'http://www.symxchange.generated.symitar.com/v1/transactions/dto';

function soapEnvelope(namespaces: Record<string, string>, body: string): string {
  const nsAttrs = Object.entries(namespaces)
    .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
    .join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${SOAP_NS}" ${nsAttrs}>
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
}

function tokenCredentials(tokenId: string, deviceType: string, deviceNumber: string): string {
  return `<Credentials>
        <TokenCredentials>
          <TokenId>${escapeXml(tokenId)}</TokenId>
        </TokenCredentials>
      </Credentials>
      <DeviceInformation DeviceType="${escapeXml(deviceType)}" DeviceNumber="${escapeXml(deviceNumber)}"/>`;
}

function _accountNumberCredentials(accountNumber: string, deviceType: string, deviceNumber: string): string {
  return `<Credentials>
        <AccountNumberCredentials>
          <AccountNumber>${escapeXml(accountNumber)}</AccountNumber>
        </AccountNumberCredentials>
      </Credentials>
      <DeviceInformation DeviceType="${escapeXml(deviceType)}" DeviceNumber="${escapeXml(deviceNumber)}"/>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extract a simple text value from XML by tag name.
 * This is intentionally simple — a full XML parser would be used in production.
 */
function extractXmlValue(xml: string, tagName: string): string | null {
  // Handle both prefixed and unprefixed tags
  const patterns = [
    new RegExp(`<(?:[a-zA-Z0-9]+:)?${tagName}[^>]*>([^<]*)</(?:[a-zA-Z0-9]+:)?${tagName}>`, 'i'),
    new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Extract an attribute value from an XML element.
 */
function extractXmlAttribute(xml: string, elementName: string, attrName: string): string | null {
  const pattern = new RegExp(`<(?:[a-zA-Z0-9]+:)?${elementName}[^>]*\\s${attrName}="([^"]*)"`, 'i');
  const match = xml.match(pattern);
  return match ? match[1] : null;
}

/**
 * Extract all matching elements from XML.
 */
function extractXmlElements(xml: string, tagName: string): string[] {
  const pattern = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tagName}[^>]*>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tagName}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

interface SymitarToken {
  tokenId: string;
  createdAt: number;
  expiresAt: number;
}

let cachedToken: SymitarToken | null = null;

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return `****${accountNo}`;
  return `****${accountNo.slice(-4)}`;
}

function mapShareType(shareType: string, description: string): CoreAccountType {
  const lower = (description || shareType || '').toLowerCase();
  if (lower.includes('checking') || lower.includes('draft') || lower.includes('share draft')) return 'checking';
  if (lower.includes('money market') || lower.includes('mm')) return 'money_market';
  if (lower.includes('certificate') || lower.includes('cd')) return 'cd';
  return 'savings';
}

function mapAccountStatus(closeDate: string | null): CoreAccountStatus {
  if (closeDate && closeDate !== '0001-01-01') return 'closed';
  return 'active';
}

function mapTransactionType(description: string, amount: number): CoreTransactionType {
  const lower = (description || '').toLowerCase();
  if (lower.includes('transfer')) return 'transfer';
  if (lower.includes('deposit') || lower.includes('rdc')) return 'deposit';
  if (lower.includes('fee') || lower.includes('charge') || lower.includes('service')) return 'fee';
  if (lower.includes('interest') || lower.includes('dividend')) return 'interest';
  if (lower.includes('withdrawal')) return 'withdrawal';
  if (lower.includes('bill pay') || lower.includes('bill pmt')) return 'bill_payment';
  return amount < 0 ? 'debit' : 'credit';
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// =============================================================================
// ADAPTER
// =============================================================================

export class SymitarCoreBankingAdapter implements CoreBankingAdapter {
  private readonly host: string;
  private readonly port: string;
  private readonly userNumber: string;
  private readonly password: string;
  private readonly deviceType: string;
  private readonly deviceNumber: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'symitar',
    name: 'Symitar SymXchange Core Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 }, // SOAP can be slower
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.host = Deno.env.get('SYMITAR_HOST') ?? '';
    this.port = Deno.env.get('SYMITAR_PORT') ?? '443';
    this.userNumber = Deno.env.get('SYMITAR_USER_NUMBER') ?? '';
    this.password = Deno.env.get('SYMITAR_PASSWORD') ?? '';
    this.deviceType = Deno.env.get('SYMITAR_DEVICE_TYPE') ?? 'CLIENTSYSTEM';
    this.deviceNumber = Deno.env.get('SYMITAR_DEVICE_NUMBER') ?? '20000';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.host || !this.userNumber;
  }

  // ---------------------------------------------------------------------------
  // SOAP HTTP client
  // ---------------------------------------------------------------------------

  private get baseUrl(): string {
    const protocol = this.port === '443' ? 'https' : 'http';
    return `${protocol}://${this.host}:${this.port}/SymXchange`;
  }

  private async soapRequest(service: string, soapBody: string): Promise<string> {
    if (this.sandbox) {
      throw new Error('Symitar adapter in sandbox mode — credentials not configured');
    }

    const url = `${this.baseUrl}/${service}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      body: soapBody,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`SymXchange SOAP error (${res.status}): ${errBody.slice(0, 500)}`);
    }

    const responseXml = await res.text();

    // Check for SOAP fault
    const faultString = extractXmlValue(responseXml, 'faultstring');
    if (faultString) {
      throw new Error(`SymXchange fault: ${faultString}`);
    }

    // Check for StatusCode error
    const statusCode = extractXmlAttribute(responseXml, 'Response', 'StatusCode');
    if (statusCode && statusCode !== '0') {
      const errorMessage = extractXmlValue(responseXml, 'ErrorMessage') ?? `StatusCode ${statusCode}`;
      throw new Error(`SymXchange error ${statusCode}: ${errorMessage}`);
    }

    return responseXml;
  }

  // ---------------------------------------------------------------------------
  // Token management — logon/logoff
  // ---------------------------------------------------------------------------

  private async getToken(): Promise<string> {
    // Return cached token if still valid (with 2-min buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 120000) {
      return cachedToken.tokenId;
    }

    const envelope = soapEnvelope(
      { user: USER_NS, com: COMMON_NS },
      `<user:logon>
        <Request MessageId="logon">
          <Credentials>
            <UserNumberCredentials>
              <UserNumber>${escapeXml(this.userNumber)}</UserNumber>
              <Password>${escapeXml(this.password)}</Password>
            </UserNumberCredentials>
          </Credentials>
          <DeviceInformation DeviceType="${escapeXml(this.deviceType)}" DeviceNumber="${escapeXml(this.deviceNumber)}"/>
        </Request>
      </user:logon>`,
    );

    const response = await this.soapRequest('UserManagementService', envelope);
    const tokenId = extractXmlValue(response, 'TokenId');
    if (!tokenId) {
      throw new Error('SymXchange logon failed — no token returned');
    }

    cachedToken = {
      tokenId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15-minute expiry
    };

    return tokenId;
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
        errorMessage: 'Running in sandbox mode',
      };
    }

    try {
      await this.getToken();
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
  // List accounts — uses getAccount with account number credential
  // ---------------------------------------------------------------------------

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    const token = await this.getToken();

    // SymXchange uses account number to look up member accounts.
    // The userId maps to the member's account number in Symitar.
    const envelope = soapEnvelope(
      { acc: ACCOUNT_NS, com: COMMON_NS },
      `<acc:getAccount>
        <Request MessageId="getaccount">
          <AccountNumber>${escapeXml(request.userId)}</AccountNumber>
          ${tokenCredentials(token, this.deviceType, this.deviceNumber)}
        </Request>
      </acc:getAccount>`,
    );

    const response = await this.soapRequest('AccountService', envelope);

    // Parse share (savings/checking) accounts from the response
    const shareElements = extractXmlElements(response, 'Share');
    const accounts: CoreAccount[] = shareElements.map((shareXml, index) => {
      const shareId = extractXmlValue(shareXml, 'Id') ?? String(index);
      const shareType = extractXmlValue(shareXml, 'Type') ?? '0';
      const description = extractXmlValue(shareXml, 'Description') ?? 'Share Account';
      const balance = parseFloat(extractXmlValue(shareXml, 'Balance') ?? '0');
      const availableBalance = parseFloat(extractXmlValue(shareXml, 'AvailableBalance') ?? String(balance));
      const openDate = extractXmlValue(shareXml, 'OpenDate') ?? new Date().toISOString();
      const closeDate = extractXmlValue(shareXml, 'CloseDate');
      const dividendRate = parseFloat(extractXmlValue(shareXml, 'DividendRate') ?? '0');
      const micrAcctNumber = extractXmlValue(shareXml, 'MicrAccountNumber') ?? `${request.userId}-S${shareId}`;

      return {
        accountId: `S${shareId}`,
        externalId: `${request.userId}-S${shareId}`,
        type: mapShareType(shareType, description),
        nickname: description,
        accountNumberMasked: maskAccountNumber(micrAcctNumber),
        routingNumber: this.routingNumber,
        balanceCents: dollarsToCents(balance),
        availableBalanceCents: dollarsToCents(availableBalance),
        status: mapAccountStatus(closeDate),
        interestRateBps: Math.round(dividendRate * 100),
        openedAt: openDate,
        closedAt: closeDate && closeDate !== '0001-01-01' ? closeDate : null,
      };
    });

    // Also parse loan accounts
    const loanElements = extractXmlElements(response, 'Loan');
    loanElements.forEach((loanXml, index) => {
      const loanId = extractXmlValue(loanXml, 'Id') ?? String(index);
      const description = extractXmlValue(loanXml, 'Description') ?? 'Loan Account';
      const balance = parseFloat(extractXmlValue(loanXml, 'Balance') ?? '0');
      const openDate = extractXmlValue(loanXml, 'OpenDate') ?? new Date().toISOString();
      const closeDate = extractXmlValue(loanXml, 'CloseDate');
      const interestRate = parseFloat(extractXmlValue(loanXml, 'InterestRate') ?? '0');

      accounts.push({
        accountId: `L${loanId}`,
        externalId: `${request.userId}-L${loanId}`,
        type: 'savings' as CoreAccountType, // Loans map to savings-like display
        nickname: description,
        accountNumberMasked: maskAccountNumber(`${request.userId}L${loanId}`),
        routingNumber: this.routingNumber,
        balanceCents: dollarsToCents(Math.abs(balance)), // Loan balances are typically negative
        availableBalanceCents: 0,
        status: mapAccountStatus(closeDate),
        interestRateBps: Math.round(interestRate * 100),
        openedAt: openDate,
        closedAt: closeDate && closeDate !== '0001-01-01' ? closeDate : null,
      });
    });

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Get single account
  // ---------------------------------------------------------------------------

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    const { accounts } = await this.listAccounts({
      userId: request.userId,
      tenantId: request.tenantId,
    });

    const account = accounts.find(a => a.accountId === request.accountId);
    if (!account) {
      throw new Error(`Account ${request.accountId} not found`);
    }

    return account;
  }

  // ---------------------------------------------------------------------------
  // List transactions
  // ---------------------------------------------------------------------------

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listTransactions(request);
    }

    if (!request.accountId) {
      return { transactions: [], total: 0 };
    }

    const token = await this.getToken();

    // Parse account type prefix (S = share, L = loan) and ID
    const accountType = request.accountId.startsWith('L') ? 'LOAN' : 'SHARE';
    const accountSubId = request.accountId.slice(1);

    // Use getAccountTransactions or PowerOn to retrieve transaction history.
    // SymXchange CRUD read on TransactionHistory record type.
    const envelope = soapEnvelope(
      { acc: ACCOUNT_NS, com: COMMON_NS },
      `<acc:getAccountSelectFields>
        <Request MessageId="gettransactions">
          <AccountNumber>${escapeXml(request.userId)}</AccountNumber>
          ${tokenCredentials(token, this.deviceType, this.deviceNumber)}
          <SelectFieldRequests>
            <SelectFieldRequest>
              <RecordType>${accountType}</RecordType>
              <RecordNumber>${escapeXml(accountSubId)}</RecordNumber>
              <FieldSelections>
                <FieldSelection>
                  <FieldName>TransactionHistory</FieldName>
                </FieldSelection>
              </FieldSelections>
            </SelectFieldRequest>
          </SelectFieldRequests>
        </Request>
      </acc:getAccountSelectFields>`,
    );

    try {
      const response = await this.soapRequest('AccountService', envelope);

      const txElements = extractXmlElements(response, 'Transaction');
      const transactions: CoreTransaction[] = txElements.map((txXml, index) => {
        const id = extractXmlValue(txXml, 'SequenceNumber') ?? String(index);
        const description = extractXmlValue(txXml, 'Description') ?? 'Transaction';
        const amount = parseFloat(extractXmlValue(txXml, 'Amount') ?? '0');
        const balance = parseFloat(extractXmlValue(txXml, 'Balance') ?? '0');
        const postDate = extractXmlValue(txXml, 'PostDate') ?? new Date().toISOString();
        const effectiveDate = extractXmlValue(txXml, 'EffectiveDate') ?? postDate;
        const comment = extractXmlValue(txXml, 'Comment') ?? '';

        return {
          transactionId: id,
          accountId: request.accountId!,
          type: mapTransactionType(description, amount),
          amountCents: dollarsToCents(Math.abs(amount)),
          description: comment || description,
          category: null,
          status: 'posted' as const,
          merchantName: null,
          merchantCategory: null,
          runningBalanceCents: dollarsToCents(balance),
          postedAt: postDate,
          createdAt: effectiveDate,
        };
      });

      // Apply filters
      let filtered = transactions;
      if (request.type) filtered = filtered.filter(t => t.type === request.type);
      if (request.status) filtered = filtered.filter(t => t.status === request.status);
      if (request.fromDate) filtered = filtered.filter(t => t.createdAt >= request.fromDate!);
      if (request.toDate) filtered = filtered.filter(t => t.createdAt <= request.toDate!);
      if (request.search) {
        const q = request.search.toLowerCase();
        filtered = filtered.filter(t => t.description.toLowerCase().includes(q));
      }

      const limit = request.limit ?? 50;
      const offset = request.offset ?? 0;

      return {
        transactions: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    } catch {
      // If transaction retrieval fails, return empty rather than crash
      return { transactions: [], total: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // Create transfer — uses TransactionsService transfer operation
  // ---------------------------------------------------------------------------

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    const token = await this.getToken();
    const { transfer } = request;

    // Parse donor (from) account
    const donorType = transfer.fromAccountId.startsWith('L') ? 'LOAN' : 'SHARE';
    const donorId = transfer.fromAccountId.slice(1);

    // Parse recipient (to) account
    const recipientAccountId = transfer.toAccountId ?? transfer.fromAccountId;
    const recipientType = recipientAccountId.startsWith('L') ? 'LOAN' : 'SHARE';
    const recipientId = recipientAccountId.slice(1);

    // For internal transfers, donor and recipient share the same account number (member)
    const donorAccountNumber = request.userId;
    const recipientAccountNumber = request.userId; // Same member for internal

    const amountDollars = (transfer.amountCents / 100).toFixed(2);

    const envelope = soapEnvelope(
      { tran: TRANS_NS, com: COMMON_NS, dto: TRANS_DTO_NS },
      `<tran:transfer>
        <Request MessageId="transfer">
          ${tokenCredentials(token, this.deviceType, this.deviceNumber)}
          <dto:DonorAccountNumber>${escapeXml(donorAccountNumber)}</dto:DonorAccountNumber>
          <dto:DonorId>${escapeXml(donorId)}</dto:DonorId>
          <dto:DonorType>${donorType}</dto:DonorType>
          <dto:RecipientAccountNumber>${escapeXml(recipientAccountNumber)}</dto:RecipientAccountNumber>
          <dto:RecipientId>${escapeXml(recipientId)}</dto:RecipientId>
          <dto:RecipientType>${recipientType}</dto:RecipientType>
          <TransferAmount>${amountDollars}</TransferAmount>
        </Request>
      </tran:transfer>`,
    );

    const response = await this.soapRequest('TransactionsService', envelope);

    const confirmation = extractXmlAttribute(response, 'Response', 'Confirmation') ?? `sym-${Date.now()}`;
    const postDate = extractXmlAttribute(response, 'Response', 'TransactionPostDate');

    return {
      transferId: confirmation,
      status: 'completed', // SymXchange transfers are immediate
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: postDate ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Card management — not available through SymXchange
  // ---------------------------------------------------------------------------

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by SymXchange — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by SymXchange — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by SymXchange — use card domain adapter');
  }
}
