/**
 * Corelation KeyStone Core Banking Adapter (KeyBridge via jXchange)
 *
 * Integrates with Corelation's KeyStone core banking system via the
 * KeyBridge XML/SOAP web service, accessed through Jack Henry's jXchange
 * Service Gateway. KeyStone is the fastest-growing core for mid-size
 * credit unions.
 *
 * Protocol details:
 *   - SOAP 1.1 over HTTPS via jXchange Service Gateway (.NET WCF)
 *   - XML namespace: xmlns="http://jackhenry.com/jxchange/TPG/2008"
 *   - jXchangeHdr required on every request for routing/audit
 *   - OAuth 2.0 for authorization (mandatory from April 2028)
 *   - KeyBridge translates jXchange contracts into KeyStone native calls
 *   - Multiple operations can be batched for performance via KeyBridge's
 *     step-wrapping capability
 *
 * jXchange operations used:
 *   - AcctInq (Account Inquiry) — fetch account detail by AcctId+AcctType
 *   - AcctSrch (Account Search) — find accounts for a member/customer
 *   - AcctReconBatchSrch — transaction history for reconciliation
 *   - XferAdd (Transfer Add) — internal/external fund transfers
 *   - CustSrch (Customer Search) — resolve member to accounts
 *
 * Account type codes (jXchange AcctType):
 *   DDA = Demand Deposit (Checking)
 *   SDA = Savings Deposit (Savings)
 *   CDA = Certificate of Deposit (CD/Term)
 *   MMA = Money Market Account
 *   ILA = Installment Loan
 *   CLA = Commercial Loan
 *
 * Configuration:
 *   KEYSTONE_GATEWAY_URL — jXchange Service Gateway endpoint
 *   KEYSTONE_CONSUMER_NAME — jXchange consumer name credential
 *   KEYSTONE_CONSUMER_PROD — jXchange consumer product credential
 *   KEYSTONE_OAUTH_TOKEN_URL — OAuth 2.0 token endpoint
 *   KEYSTONE_OAUTH_CLIENT_ID — OAuth client ID
 *   KEYSTONE_OAUTH_CLIENT_SECRET — OAuth client secret
 *   KEYSTONE_INST_RT_ID — Institution Routing ID (ABA number)
 *   KEYSTONE_INST_ENV — Institution environment (e.g., PROD, TEST)
 *   INSTITUTION_ROUTING_NUMBER — ABA routing number for account display
 *
 * Sandbox mode auto-enabled when gateway URL is not configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreAccountType,
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
// CONSTANTS — jXchange namespace and SOAP envelope
// =============================================================================

const JXCHANGE_NS = 'http://jackhenry.com/jxchange/TPG/2008';
const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';

// =============================================================================
// XML HELPERS
// =============================================================================

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
 * Handles optional namespace prefixes (e.g., <jx:AcctId> or <AcctId>).
 */
function extractXmlValue(xml: string, tagName: string): string | null {
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
 * Extract all matching elements (with their full content) from XML.
 */
function extractXmlElements(xml: string, tagName: string): string[] {
  const pattern = new RegExp(
    `<(?:[a-zA-Z0-9]+:)?${tagName}[^>]*>[\\s\\S]*?</(?:[a-zA-Z0-9]+:)?${tagName}>`,
    'gi',
  );
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

/**
 * Check for SOAP Fault in the response envelope.
 */
function checkSoapFault(xml: string): void {
  if (xml.includes('Fault>') || xml.includes('fault>')) {
    const faultCode = extractXmlValue(xml, 'faultcode') ?? extractXmlValue(xml, 'Code');
    const faultString = extractXmlValue(xml, 'faultstring') ?? extractXmlValue(xml, 'Reason') ?? 'Unknown SOAP Fault';
    throw new Error(`jXchange SOAP Fault [${faultCode ?? 'unknown'}]: ${faultString}`);
  }
}

/**
 * Check for jXchange-level errors in the response (ErrCde, ErrDesc).
 */
function checkJxError(xml: string): void {
  const errCde = extractXmlValue(xml, 'ErrCde');
  if (errCde && errCde !== '0') {
    const errDesc = extractXmlValue(xml, 'ErrDesc') ?? `Error code ${errCde}`;
    throw new Error(`jXchange error ${errCde}: ${errDesc}`);
  }
}

// =============================================================================
// SOAP ENVELOPE BUILDER
// =============================================================================

/**
 * Build the jXchangeHdr XML block required on every jXchange request.
 * Contains routing, audit, and consumer credential information.
 *
 * @see https://jackhenry.dev/jxchange-soap/jxchange-environment/jxchange-behaviors/
 */
function buildJxChangeHdr(cfg: {
  instRtId: string;
  instEnv: string;
  consumerName: string;
  consumerProd: string;
  auditUsrId: string;
  trackingId: string;
}): string {
  return `<jXchangeHdr>
        <JxVer/>
        <AuditUsrId>${escapeXml(cfg.auditUsrId)}</AuditUsrId>
        <AuditWsId>KeyStoneAdapter</AuditWsId>
        <ConsumerName>${escapeXml(cfg.consumerName)}</ConsumerName>
        <ConsumerProd>${escapeXml(cfg.consumerProd)}</ConsumerProd>
        <jXLogTrackingId>${escapeXml(cfg.trackingId)}</jXLogTrackingId>
        <InstRtId>${escapeXml(cfg.instRtId)}</InstRtId>
        <InstEnv>${escapeXml(cfg.instEnv)}</InstEnv>
        <ValidConsmName>${escapeXml(cfg.consumerName)}</ValidConsmName>
        <ValidConsmProd>${escapeXml(cfg.consumerProd)}</ValidConsmProd>
      </jXchangeHdr>`;
}

/**
 * Wrap a jXchange request body in a full SOAP 1.1 envelope.
 *
 * SOAP structure:
 *   <SOAP-ENV:Envelope>
 *     <SOAP-ENV:Body>
 *       <OperationRq xmlns="http://jackhenry.com/jxchange/TPG/2008">
 *         <jXchangeHdr>...</jXchangeHdr>
 *         ...operation-specific elements...
 *       </OperationRq>
 *     </SOAP-ENV:Body>
 *   </SOAP-ENV:Envelope>
 */
function soapEnvelope(operationBody: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="${SOAP_NS}" xmlns:jx="${JXCHANGE_NS}">
  <SOAP-ENV:Body>
    ${operationBody}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

// =============================================================================
// OAUTH TOKEN CACHE
// =============================================================================

interface OAuthToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: OAuthToken | null = null;

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return `****${accountNo}`;
  return `****${accountNo.slice(-4)}`;
}

/**
 * Map jXchange AcctType codes to our CoreAccountType enum.
 * Standard jXchange codes: DDA, SDA, CDA, MMA, ILA, CLA, etc.
 */
function mapAcctType(acctType: string): CoreAccountType {
  switch (acctType.toUpperCase()) {
    case 'DDA': return 'checking';
    case 'SDA': return 'savings';
    case 'CDA': return 'cd';
    case 'MMA': return 'money_market';
    default: return 'savings';
  }
}

/**
 * Reverse map: CoreAccountType → jXchange AcctType code.
 */
function _toJxAcctType(type: CoreAccountType): string {
  switch (type) {
    case 'checking': return 'DDA';
    case 'savings': return 'SDA';
    case 'cd': return 'CDA';
    case 'money_market': return 'MMA';
    default: return 'SDA';
  }
}

function mapTransactionType(typeCode: string, description: string, amount: number): CoreTransactionType {
  const lower = (description || typeCode || '').toLowerCase();
  if (lower.includes('transfer') || lower.includes('xfer')) return 'transfer';
  if (lower.includes('deposit') || lower.includes('rdc')) return 'deposit';
  if (lower.includes('fee') || lower.includes('charge') || lower.includes('service')) return 'fee';
  if (lower.includes('interest') || lower.includes('dividend')) return 'interest';
  if (lower.includes('withdrawal') || lower.includes('atm')) return 'withdrawal';
  if (lower.includes('bill pay') || lower.includes('bill pmt')) return 'bill_payment';
  return amount < 0 ? 'debit' : 'credit';
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function generateTrackingId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// ADAPTER
// =============================================================================

export class KeyStoneCoreBankingAdapter implements CoreBankingAdapter {
  private readonly gatewayUrl: string;
  private readonly consumerName: string;
  private readonly consumerProd: string;
  private readonly oauthTokenUrl: string;
  private readonly oauthClientId: string;
  private readonly oauthClientSecret: string;
  private readonly instRtId: string;
  private readonly instEnv: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'keystone',
    name: 'Corelation KeyStone Core Banking (KeyBridge via jXchange)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 }, // SOAP can be slower than REST
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.gatewayUrl = Deno.env.get('KEYSTONE_GATEWAY_URL') ?? '';
    this.consumerName = Deno.env.get('KEYSTONE_CONSUMER_NAME') ?? '';
    this.consumerProd = Deno.env.get('KEYSTONE_CONSUMER_PROD') ?? '';
    this.oauthTokenUrl = Deno.env.get('KEYSTONE_OAUTH_TOKEN_URL') ?? '';
    this.oauthClientId = Deno.env.get('KEYSTONE_OAUTH_CLIENT_ID') ?? '';
    this.oauthClientSecret = Deno.env.get('KEYSTONE_OAUTH_CLIENT_SECRET') ?? '';
    this.instRtId = Deno.env.get('KEYSTONE_INST_RT_ID') ?? Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '';
    this.instEnv = Deno.env.get('KEYSTONE_INST_ENV') ?? 'PROD';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.gatewayUrl;
  }

  // ---------------------------------------------------------------------------
  // OAuth 2.0 token management
  // ---------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
      return cachedToken.accessToken;
    }

    if (!this.oauthTokenUrl || !this.oauthClientId) {
      throw new Error('KeyStone OAuth not configured — set KEYSTONE_OAUTH_TOKEN_URL, KEYSTONE_OAUTH_CLIENT_ID, KEYSTONE_OAUTH_CLIENT_SECRET');
    }

    const res = await fetch(this.oauthTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.oauthClientId}:${this.oauthClientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OAuth token request failed (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const body = await res.json();
    cachedToken = {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };

    return cachedToken.accessToken;
  }

  // ---------------------------------------------------------------------------
  // SOAP request dispatcher
  // ---------------------------------------------------------------------------

  private async soapRequest(soapAction: string, body: string): Promise<string> {
    if (this.sandbox) {
      throw new Error('KeyStone adapter in sandbox mode — KEYSTONE_GATEWAY_URL not configured');
    }

    const accessToken = await this.getAccessToken();

    const res = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${soapAction}"`,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: soapEnvelope(body),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`jXchange Gateway error (${res.status}): ${errBody.slice(0, 500)}`);
    }

    const responseXml = await res.text();

    // Check for SOAP faults and jXchange-level errors
    checkSoapFault(responseXml);
    checkJxError(responseXml);

    return responseXml;
  }

  /**
   * Build a jXchangeHdr for the current request.
   */
  private jxHdr(auditUsrId: string): string {
    return buildJxChangeHdr({
      instRtId: this.instRtId,
      instEnv: this.instEnv,
      consumerName: this.consumerName,
      consumerProd: this.consumerProd,
      auditUsrId,
      trackingId: generateTrackingId(),
    });
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
      // Validate OAuth connectivity
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
  // List accounts — jXchange AcctSrch + AcctInq
  //
  // 1. CustSrch resolves the member (userId) to their account list
  // 2. AcctInq retrieves detail for each account
  //
  // KeyBridge's step-wrapping allows batching these into fewer round-trips.
  // ---------------------------------------------------------------------------

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    const hdr = this.jxHdr(request.userId);

    // Step 1: Search for accounts belonging to this member via AcctSrch
    const acctSrchBody = `<AcctSrchRq_MType xmlns="${JXCHANGE_NS}">
      ${hdr}
      <SrchMsgRqHdr>
        <MaxRec>100</MaxRec>
        <Cursor/>
      </SrchMsgRqHdr>
      <PersonSrchIdent>${escapeXml(request.userId)}</PersonSrchIdent>
    </AcctSrchRq_MType>`;

    const srchResponse = await this.soapRequest(
      `${JXCHANGE_NS}/AcctSrch`,
      acctSrchBody,
    );

    // Parse account records from AcctSrchRs
    const acctRecords = extractXmlElements(srchResponse, 'AcctSrchRec_CType');
    const accounts: CoreAccount[] = [];

    for (const rec of acctRecords) {
      const acctId = extractXmlValue(rec, 'AcctId') ?? '';
      const acctType = extractXmlValue(rec, 'AcctType') ?? 'SDA';
      const acctDesc = extractXmlValue(rec, 'Desc') ?? extractXmlValue(rec, 'AcctDesc') ?? '';

      // Exclude loan accounts — they have separate treatment via ILA/CLA types
      const coreType = mapAcctType(acctType);

      // Step 2: Get full detail via AcctInq for each account
      const acctInqBody = `<AcctInqRq_MType xmlns="${JXCHANGE_NS}">
        ${hdr}
        <InAcctId>
          <AcctId>${escapeXml(acctId)}</AcctId>
          <AcctType>${escapeXml(acctType)}</AcctType>
        </InAcctId>
        <IncXtendElemArray>
          <IncXtendElemInfo>
            <XtendElem>DepAcctRec</XtendElem>
          </IncXtendElemInfo>
        </IncXtendElemArray>
      </AcctInqRq_MType>`;

      try {
        const inqResponse = await this.soapRequest(
          `${JXCHANGE_NS}/AcctInq`,
          acctInqBody,
        );

        // jXchange AcctInq response fields
        const curBal = parseFloat(extractXmlValue(inqResponse, 'CurBal') ?? '0');
        const availBal = parseFloat(extractXmlValue(inqResponse, 'AvailBal') ?? String(curBal));
        const openDt = extractXmlValue(inqResponse, 'OpenDt');
        const closeDt = extractXmlValue(inqResponse, 'CloseDt');
        const intRate = parseFloat(extractXmlValue(inqResponse, 'IntRate') ?? extractXmlValue(inqResponse, 'DivRate') ?? '0');
        const nickname = extractXmlValue(inqResponse, 'Desc') ?? acctDesc;
        const acctStat = extractXmlValue(inqResponse, 'AcctStat') ?? 'Active';

        let status: 'active' | 'frozen' | 'closed' | 'pending' = 'active';
        const statLower = acctStat.toLowerCase();
        if (statLower.includes('close') || statLower === 'closed') status = 'closed';
        else if (statLower.includes('frozen') || statLower.includes('restrict')) status = 'frozen';

        accounts.push({
          accountId: `${acctType}-${acctId}`,
          externalId: acctId,
          type: coreType,
          nickname,
          accountNumberMasked: maskAccountNumber(acctId),
          routingNumber: this.routingNumber,
          balanceCents: dollarsToCents(curBal),
          availableBalanceCents: dollarsToCents(availBal),
          status,
          interestRateBps: Math.round(intRate * 100),
          openedAt: openDt ?? new Date().toISOString(),
          closedAt: closeDt ?? null,
        });
      } catch {
        // Skip accounts we can't retrieve detail for
      }
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Get single account — jXchange AcctInq
  // ---------------------------------------------------------------------------

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    // accountId format: "DDA-12345" → AcctType=DDA, AcctId=12345
    const [acctType, acctId] = parseAccountId(request.accountId);
    const hdr = this.jxHdr(request.userId);

    const acctInqBody = `<AcctInqRq_MType xmlns="${JXCHANGE_NS}">
      ${hdr}
      <InAcctId>
        <AcctId>${escapeXml(acctId)}</AcctId>
        <AcctType>${escapeXml(acctType)}</AcctType>
      </InAcctId>
      <IncXtendElemArray>
        <IncXtendElemInfo>
          <XtendElem>DepAcctRec</XtendElem>
        </IncXtendElemInfo>
      </IncXtendElemArray>
    </AcctInqRq_MType>`;

    const inqResponse = await this.soapRequest(
      `${JXCHANGE_NS}/AcctInq`,
      acctInqBody,
    );

    const curBal = parseFloat(extractXmlValue(inqResponse, 'CurBal') ?? '0');
    const availBal = parseFloat(extractXmlValue(inqResponse, 'AvailBal') ?? String(curBal));
    const openDt = extractXmlValue(inqResponse, 'OpenDt');
    const closeDt = extractXmlValue(inqResponse, 'CloseDt');
    const intRate = parseFloat(extractXmlValue(inqResponse, 'IntRate') ?? extractXmlValue(inqResponse, 'DivRate') ?? '0');
    const nickname = extractXmlValue(inqResponse, 'Desc') ?? '';
    const acctStat = extractXmlValue(inqResponse, 'AcctStat') ?? 'Active';

    let status: 'active' | 'frozen' | 'closed' | 'pending' = 'active';
    const statLower = acctStat.toLowerCase();
    if (statLower.includes('close') || statLower === 'closed') status = 'closed';
    else if (statLower.includes('frozen') || statLower.includes('restrict')) status = 'frozen';

    return {
      accountId: request.accountId,
      externalId: acctId,
      type: mapAcctType(acctType),
      nickname,
      accountNumberMasked: maskAccountNumber(acctId),
      routingNumber: this.routingNumber,
      balanceCents: dollarsToCents(curBal),
      availableBalanceCents: dollarsToCents(availBal),
      status,
      interestRateBps: Math.round(intRate * 100),
      openedAt: openDt ?? new Date().toISOString(),
      closedAt: closeDt ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // List transactions — jXchange AcctReconBatchSrch
  //
  // AcctReconBatchSrch is the jXchange service designed to obtain an
  // account's transactional data for reconciliation. Supports date-range
  // filtering natively.
  // ---------------------------------------------------------------------------

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listTransactions(request);
    }

    if (!request.accountId) {
      return { transactions: [], total: 0 };
    }

    const [acctType, acctId] = parseAccountId(request.accountId);
    const hdr = this.jxHdr(request.userId);

    // Default date range: last 90 days if not specified
    const today = new Date();
    const defaultFrom = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const fromDate = request.fromDate ?? defaultFrom.toISOString().split('T')[0];
    const toDate = request.toDate ?? today.toISOString().split('T')[0];

    const trnSrchBody = `<AcctReconBatchSrchRq_MType xmlns="${JXCHANGE_NS}">
      ${hdr}
      <SrchMsgRqHdr>
        <MaxRec>500</MaxRec>
        <Cursor/>
      </SrchMsgRqHdr>
      <InAcctId>
        <AcctId>${escapeXml(acctId)}</AcctId>
        <AcctType>${escapeXml(acctType)}</AcctType>
      </InAcctId>
      <StartDt>${escapeXml(fromDate)}</StartDt>
      <EndDt>${escapeXml(toDate)}</EndDt>
    </AcctReconBatchSrchRq_MType>`;

    try {
      const response = await this.soapRequest(
        `${JXCHANGE_NS}/AcctReconBatchSrch`,
        trnSrchBody,
      );

      // Parse transaction records from AcctReconBatchSrchRs
      const trnRecords = extractXmlElements(response, 'AcctReconBatchSrchRec_CType');
      const transactions: CoreTransaction[] = trnRecords.map((trnXml, index) => {
        const trnId = extractXmlValue(trnXml, 'TrnId') ?? extractXmlValue(trnXml, 'SeqNum') ?? String(index);
        const trnType = extractXmlValue(trnXml, 'TrnType') ?? '';
        const desc = extractXmlValue(trnXml, 'Desc') ?? extractXmlValue(trnXml, 'TrnDesc') ?? 'Transaction';
        const amt = parseFloat(extractXmlValue(trnXml, 'Amt') ?? extractXmlValue(trnXml, 'TrnAmt') ?? '0');
        const runBal = parseFloat(extractXmlValue(trnXml, 'RunBal') ?? '0');
        const postDt = extractXmlValue(trnXml, 'PostDt') ?? new Date().toISOString();
        const effDt = extractXmlValue(trnXml, 'EffDt') ?? postDt;
        const chkNum = extractXmlValue(trnXml, 'ChkNum');

        const description = chkNum ? `Check #${chkNum} - ${desc}` : desc;

        return {
          transactionId: trnId,
          accountId: request.accountId!,
          type: mapTransactionType(trnType, desc, amt),
          amountCents: dollarsToCents(Math.abs(amt)),
          description,
          category: null,
          status: 'posted' as const,
          merchantName: null,
          merchantCategory: null,
          runningBalanceCents: dollarsToCents(runBal),
          postedAt: postDt,
          createdAt: effDt,
        };
      });

      // Apply client-side filters not supported by AcctReconBatchSrch
      let filtered = transactions;
      if (request.type) filtered = filtered.filter(t => t.type === request.type);
      if (request.status) filtered = filtered.filter(t => t.status === request.status);
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
      return { transactions: [], total: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // Create transfer — jXchange XferAdd
  //
  // XferAdd provides the ability to transfer funds between accounts,
  // make loan payments, or schedule future/recurring transactions.
  // Uses AcctIdFrom/AcctIdTo complexes with AcctId+AcctType.
  // Note: XferAdd does not support Time Deposit or GL as source/dest;
  // use TrnAdd for those.
  // ---------------------------------------------------------------------------

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    const hdr = this.jxHdr(request.userId);
    const { transfer } = request;

    // Parse "DDA-12345" format account IDs
    const [fromAcctType, fromAcctId] = parseAccountId(transfer.fromAccountId);
    const toAccountId = transfer.toAccountId ?? transfer.fromAccountId;
    const [toAcctType, toAcctId] = parseAccountId(toAccountId);

    const amountDollars = (transfer.amountCents / 100).toFixed(2);

    // XferType: Internal = within same FI, External = ACH/other institution
    const xferType = transfer.type === 'external' ? 'External' : 'Internal';

    const memoElem = transfer.memo
      ? `<Memo>${escapeXml(transfer.memo)}</Memo>`
      : '';

    const xferAddBody = `<XferAddRq_MType xmlns="${JXCHANGE_NS}">
      ${hdr}
      <XferType>${xferType}</XferType>
      <AcctIdFrom>
        <AcctId>${escapeXml(fromAcctId)}</AcctId>
        <AcctType>${escapeXml(fromAcctType)}</AcctType>
      </AcctIdFrom>
      <AcctIdTo>
        <AcctId>${escapeXml(toAcctId)}</AcctId>
        <AcctType>${escapeXml(toAcctType)}</AcctType>
      </AcctIdTo>
      <Amt>${amountDollars}</Amt>
      ${memoElem}
    </XferAddRq_MType>`;

    const response = await this.soapRequest(
      `${JXCHANGE_NS}/XferAdd`,
      xferAddBody,
    );

    const xferId = extractXmlValue(response, 'XferId') ?? extractXmlValue(response, 'ConfNum') ?? `ks-${Date.now()}`;
    const postDt = extractXmlValue(response, 'PostDt');
    const xferStat = extractXmlValue(response, 'XferStat') ?? 'Completed';

    const statusLower = xferStat.toLowerCase();
    let status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' = 'completed';
    if (statusLower.includes('pend')) status = 'pending';
    else if (statusLower.includes('process') || statusLower.includes('forward')) status = 'processing';
    else if (statusLower.includes('fail') || statusLower.includes('reject')) status = 'failed';

    return {
      transferId: xferId,
      status,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: postDt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Card management — not available through jXchange core services
  // Card operations should use the dedicated card domain adapter.
  // ---------------------------------------------------------------------------

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by jXchange core — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by jXchange core — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by jXchange core — use card domain adapter');
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Parse composite accountId format "ACCTTYPE-ACCTNUM" (e.g., "DDA-12345")
 * back into [acctType, acctId] for jXchange requests.
 */
function parseAccountId(compositeId: string): [string, string] {
  const dashIdx = compositeId.indexOf('-');
  if (dashIdx === -1) {
    // Fall back: assume savings if no type prefix
    return ['SDA', compositeId];
  }
  return [compositeId.slice(0, dashIdx), compositeId.slice(dashIdx + 1)];
}
