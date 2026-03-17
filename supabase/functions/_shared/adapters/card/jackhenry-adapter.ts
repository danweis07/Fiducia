// TODO: Provisional integration — not yet validated in production.
/**
 * Jack Henry jXchange EFT Card Services Adapter
 *
 * Integrates with Jack Henry's jXchange platform via the EFT Card Services
 * SOAP API (Third Party). This adapter handles debit/ATM card management
 * for financial institutions running Jack Henry core banking systems
 * (Symitar, SilverLake, CIF 20/20, Core Director).
 *
 * jXchange EFT Card Services operations used:
 *   - EFTCardSrch:          Search cards by customer ID or account
 *   - EFTCardInq:           Get detailed card information
 *   - EFTCardMod:           Modify card status, limits, and properties
 *   - EFTCardTrnHistSrch:   Card transaction history
 *   - EFTCardOrderAdd:      Activate/issue a card
 *
 * Authentication:
 *   jXchange uses WS-Security with SAML 2.0 via AuthenUsrCred_CType,
 *   plus institutional routing via InstRtId in jXchangeHdr_CType.
 *
 * Configuration:
 *   JXCHANGE_HOST       — jXchange Service Gateway hostname
 *   JXCHANGE_PORT       — jXchange port (default: 443)
 *   JXCHANGE_USERNAME   — WS-Security username token
 *   JXCHANGE_PASSWORD   — WS-Security password credential
 *   JXCHANGE_INST_RT_ID — Institution routing/transit ID (ABA number)
 *   JXCHANGE_CONSUMER   — Consumer name for audit (default: DigitalBanking)
 *   JXCHANGE_PRODUCT    — Consumer product name for audit (default: WebPortal)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardAdapter,
  Card,
  CardType,
  CardStatus,
  CardTransaction,
  CardTransactionType,
  CardTransactionStatus,
  ListCardsRequest,
  ListCardsResponse,
  GetCardRequest,
  LockCardRequest,
  UnlockCardRequest,
  SetCardLimitRequest,
  ListCardTransactionsRequest,
  ListCardTransactionsResponse,
  ActivateCardRequest,
} from './types.ts';

// =============================================================================
// XML / SOAP HELPERS
// =============================================================================

const JXCHANGE_NS = 'http://www.jackhenry.com/jxchange/TPG/2008';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function soapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:jx="${JXCHANGE_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
}

function msgRqHdr(
  instRtId: string,
  username: string,
  password: string,
  consumerName: string,
  consumerProd: string,
  auditUsrId: string,
): string {
  return `<jx:MsgRqHdr>
      <jx:jXchangeHdr>
        <jx:InstRtId>${escapeXml(instRtId)}</jx:InstRtId>
        <jx:InstEnv>Prod</jx:InstEnv>
        <jx:ConsumerName>${escapeXml(consumerName)}</jx:ConsumerName>
        <jx:ConsumerProd>${escapeXml(consumerProd)}</jx:ConsumerProd>
        <jx:AuditUsrId>${escapeXml(auditUsrId)}</jx:AuditUsrId>
      </jx:jXchangeHdr>
      <jx:AuthenUsrCred>
        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
          <wsse:UsernameToken>
            <wsse:Username>${escapeXml(username)}</wsse:Username>
            <wsse:Password>${escapeXml(password)}</wsse:Password>
          </wsse:UsernameToken>
        </wsse:Security>
      </jx:AuthenUsrCred>
    </jx:MsgRqHdr>`;
}

function srchMsgRqHdr(
  instRtId: string,
  username: string,
  password: string,
  consumerName: string,
  consumerProd: string,
  auditUsrId: string,
  maxRec?: number,
): string {
  return `<jx:SrchMsgRqHdr>
      <jx:jXchangeHdr>
        <jx:InstRtId>${escapeXml(instRtId)}</jx:InstRtId>
        <jx:InstEnv>Prod</jx:InstEnv>
        <jx:ConsumerName>${escapeXml(consumerName)}</jx:ConsumerName>
        <jx:ConsumerProd>${escapeXml(consumerProd)}</jx:ConsumerProd>
        <jx:AuditUsrId>${escapeXml(auditUsrId)}</jx:AuditUsrId>
      </jx:jXchangeHdr>
      <jx:AuthenUsrCred>
        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
          <wsse:UsernameToken>
            <wsse:Username>${escapeXml(username)}</wsse:Username>
            <wsse:Password>${escapeXml(password)}</wsse:Password>
          </wsse:UsernameToken>
        </wsse:Security>
      </jx:AuthenUsrCred>
      ${maxRec ? `<jx:MaxRec>${maxRec}</jx:MaxRec>` : ''}
    </jx:SrchMsgRqHdr>`;
}

/**
 * Extract a simple text value from XML by tag name.
 * Handles both prefixed (jx:TagName) and unprefixed (TagName) elements.
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
 * Extract all matching elements from XML.
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

function maskCardNumber(cardNum: string): string {
  if (cardNum.length <= 4) return `****${cardNum}`;
  return `****${cardNum.slice(-4)}`;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapCardType(eftCardType?: string | null): CardType {
  switch (eftCardType?.toLowerCase()) {
    case 'credit': return 'credit';
    case 'atm': return 'atm';
    default: return 'debit';
  }
}

/**
 * Map jXchange EFTCardStatType canonical values to our CardStatus.
 */
function mapCardStatus(eftStatus: string | null): CardStatus {
  switch (eftStatus) {
    case 'Act': return 'active';
    case 'HotCard': return 'hot_card';
    case 'WarmCard': return 'warm_card';
    case 'Cls':
    case 'Del': return 'closed';
    case 'Exp': return 'expired';
    case 'Iss':
    case 'InstantIss':
    case 'InstantIssMail': return 'issued';
    case 'OrderCard':
    case 'OrderInProc':
    case 'ReOrderCard': return 'order_in_process';
    case 'PINMail':
    case 'PINXsTries': return 'pin_mail';
    case 'DepOnly': return 'deposit_only';
    case 'ManActReq': return 'inactive';
    case 'CardLmtExist': return 'active'; // Active with limits
    case 'ReOrderDeny': return 'closed';
    default: return 'inactive';
  }
}

/**
 * Map our lock reason to jXchange CardStatRsnType (ISO 8583 codes).
 */
function mapLockReasonToISO(reason: string): string {
  switch (reason) {
    case 'lost': return '41';       // Lost card, pick up
    case 'stolen': return '43';     // Stolen card, pick up
    case 'fraud_suspected': return '59'; // Suspected fraud
    case 'do_not_honor': return '05';    // Do Not Honor
    default: return '59';
  }
}

/**
 * Map our lock reason to the target EFTCardStatType.
 */
function mapLockReasonToStatus(reason: string): string {
  return reason === 'fraud_suspected' ? 'WarmCard' : 'HotCard';
}

function mapTransactionType(eftTrnCode: string | null, eftTrnDesc: string | null): CardTransactionType {
  const desc = (eftTrnDesc ?? eftTrnCode ?? '').toLowerCase();
  if (desc.includes('pos') || desc.includes('purchase')) return 'pos';
  if (desc.includes('withdrawal') || desc.includes('wthdwl')) return 'atm_withdrawal';
  if (desc.includes('deposit') || desc.includes('dep')) return 'atm_deposit';
  if (desc.includes('inquiry') || desc.includes('inq')) return 'atm_inquiry';
  if (desc.includes('transfer') || desc.includes('xfer')) return 'transfer';
  if (desc.includes('debit') || desc.includes('dr')) return 'debit_card';
  return 'other';
}

function mapTransactionStatus(eftStatus: string | null, isSettled: boolean): CardTransactionStatus {
  if (eftStatus?.toLowerCase().includes('decline') || eftStatus?.toLowerCase().includes('denied')) return 'declined';
  if (eftStatus?.toLowerCase().includes('revers')) return 'reversed';
  if (eftStatus?.toLowerCase().includes('pend')) return 'pending';
  return isSettled ? 'settled' : 'approved';
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// =============================================================================
// ADAPTER
// =============================================================================

export class JackHenryCardAdapter implements CardAdapter {
  private readonly host: string;
  private readonly port: string;
  private readonly username: string;
  private readonly password: string;
  private readonly instRtId: string;
  private readonly consumerName: string;
  private readonly consumerProd: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'jackhenry',
    name: 'Jack Henry jXchange EFT Card Services',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 }, // SOAP can be slower
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.host = Deno.env.get('JXCHANGE_HOST') ?? '';
    this.port = Deno.env.get('JXCHANGE_PORT') ?? '443';
    this.username = Deno.env.get('JXCHANGE_USERNAME') ?? '';
    this.password = Deno.env.get('JXCHANGE_PASSWORD') ?? '';
    this.instRtId = Deno.env.get('JXCHANGE_INST_RT_ID') ?? '';
    this.consumerName = Deno.env.get('JXCHANGE_CONSUMER') ?? 'DigitalBanking';
    this.consumerProd = Deno.env.get('JXCHANGE_PRODUCT') ?? 'WebPortal';
    this.sandbox = !this.host || !this.username;
  }

  // ---------------------------------------------------------------------------
  // SOAP HTTP client
  // ---------------------------------------------------------------------------

  private get baseUrl(): string {
    const protocol = this.port === '443' ? 'https' : 'http';
    return `${protocol}://${this.host}:${this.port}/jXchange`;
  }

  private async soapRequest(service: string, action: string, soapBody: string): Promise<string> {
    if (this.sandbox) {
      throw new Error('Jack Henry adapter in sandbox mode — credentials not configured');
    }

    const url = `${this.baseUrl}/${service}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': action,
      },
      body: soapBody,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`jXchange SOAP error (${res.status}): ${errBody.slice(0, 500)}`);
    }

    const responseXml = await res.text();

    // Check for SOAP fault
    const faultString = extractXmlValue(responseXml, 'faultstring');
    if (faultString) {
      throw new Error(`jXchange fault: ${faultString}`);
    }

    // Check RsStat for failure
    const rsStat = extractXmlValue(responseXml, 'RsStat');
    if (rsStat === 'Fail') {
      const errDesc = extractXmlValue(responseXml, 'ErrDesc') ?? 'Request failed';
      const errCode = extractXmlValue(responseXml, 'ErrCode') ?? 'UNKNOWN';
      throw new Error(`jXchange error ${errCode}: ${errDesc}`);
    }

    return responseXml;
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
      // Use EFTCardSrch with a dummy search to verify connectivity
      // jXchange supports a PingAll service for health checks
      const envelope = soapEnvelope(
        `<jx:EFTCardSrchRq>
          ${srchMsgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'HEALTH_CHECK', 1)}
          <jx:CustId>HEALTH_CHECK</jx:CustId>
        </jx:EFTCardSrchRq>`,
      );
      await this.soapRequest('EFTCardService', 'EFTCardSrch', envelope);
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
  // List cards — EFTCardSrch by CustId
  // ---------------------------------------------------------------------------

  async listCards(request: ListCardsRequest): Promise<ListCardsResponse> {
    if (this.sandbox) {
      const { MockCardAdapter } = await import('./mock-adapter.ts');
      return new MockCardAdapter().listCards(request);
    }

    const envelope = soapEnvelope(
      `<jx:EFTCardSrchRq>
        ${srchMsgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'CARD_SEARCH', 100)}
        <jx:CustId>${escapeXml(request.customerId)}</jx:CustId>
      </jx:EFTCardSrchRq>`,
    );

    const response = await this.soapRequest('EFTCardService', 'EFTCardSrch', envelope);
    const cardElements = extractXmlElements(response, 'EFTCardSrchRec');

    let cards: Card[] = cardElements.map(cardXml => {
      const cardNum = extractXmlValue(cardXml, 'EFTCardNum') ?? '';
      const suffix = extractXmlValue(cardXml, 'EFTCardSufxNum');
      const statusType = extractXmlValue(cardXml, 'EFTCardStatType')
        ?? extractXmlValue(cardXml, 'EFTCardStat');
      const embosName = extractXmlValue(cardXml, 'EmbosName') ?? '';
      const secdEmbosName = extractXmlValue(cardXml, 'SecdEmbosName');
      const custId = extractXmlValue(cardXml, 'CustId') ?? request.customerId;
      const lastActDt = extractXmlValue(cardXml, 'LastActDt');

      return {
        cardNumberMasked: maskCardNumber(cardNum),
        cardSuffix: suffix,
        type: 'debit' as CardType, // Search doesn't return card type
        status: mapCardStatus(statusType),
        productCode: null,
        productDescription: null,
        embossedName: embosName,
        secondaryEmbossedName: secdEmbosName,
        customerId: custId,
        expirationDate: null,
        originalIssueDate: null,
        lastActivityDate: lastActDt,
        atmDailyLimitCents: null,
        posDailyLimitCents: null,
        foreignTransactionsAllowed: false,
        digitalWalletAllowed: false,
        invalidPinAttempts: 0,
      };
    });

    if (request.status) {
      cards = cards.filter(c => c.status === request.status);
    }

    return { cards, total: cards.length };
  }

  // ---------------------------------------------------------------------------
  // Get card — EFTCardInq by EFTCardNum
  // ---------------------------------------------------------------------------

  async getCard(request: GetCardRequest): Promise<Card> {
    if (this.sandbox) {
      const { MockCardAdapter } = await import('./mock-adapter.ts');
      return new MockCardAdapter().getCard(request);
    }

    const suffixElement = request.cardSuffix
      ? `<jx:EFTCardSufxNum>${escapeXml(request.cardSuffix)}</jx:EFTCardSufxNum>`
      : '';

    const envelope = soapEnvelope(
      `<jx:EFTCardInqRq>
        ${msgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'CARD_INQUIRY')}
        <jx:EFTCardNum>${escapeXml(request.cardNumber)}</jx:EFTCardNum>
        ${suffixElement}
        <jx:ActIntent>ReadOnly</jx:ActIntent>
      </jx:EFTCardInqRq>`,
    );

    const response = await this.soapRequest('EFTCardService', 'EFTCardInq', envelope);

    // Parse EFTCardInqRec_CType complex
    const inqRec = extractXmlElements(response, 'EFTCardInqRec')[0] ?? response;

    const statusType = extractXmlValue(inqRec, 'EFTCardStatType')
      ?? extractXmlValue(inqRec, 'EFTCardStat');
    const cardExpDt = extractXmlValue(inqRec, 'EFTCardExpDt');
    const origIssueDt = extractXmlValue(inqRec, 'EFTCardOrigIssueDt');
    const lastActDt = extractXmlValue(inqRec, 'LastActDt');
    const embosName = extractXmlValue(inqRec, 'EmbosName') ?? '';
    const secdEmbosName = extractXmlValue(inqRec, 'SecdEmbosName');
    const custId = extractXmlValue(inqRec, 'CustId') ?? '';
    const prodCode = extractXmlValue(inqRec, 'EFTCardProdCode');
    const prodDesc = extractXmlValue(inqRec, 'EFTCardProdDesc');
    const atmLmt = extractXmlValue(inqRec, 'ATMDrPostLmtAmt');
    const posLmt = extractXmlValue(inqRec, 'POSDrPostLmtAmt');
    const allowForn = extractXmlValue(inqRec, 'AllowFornTrnType');
    const allowDigital = extractXmlValue(inqRec, 'AllowDigitalOnlyType');
    const invalidPin = extractXmlValue(inqRec, 'InvalidPINAttempts');

    return {
      cardNumberMasked: maskCardNumber(request.cardNumber),
      cardSuffix: request.cardSuffix ?? extractXmlValue(response, 'EFTCardSufxNum'),
      type: mapCardType(extractXmlValue(inqRec, 'EFTCardType')),
      status: mapCardStatus(statusType),
      productCode: prodCode,
      productDescription: prodDesc,
      embossedName: embosName,
      secondaryEmbossedName: secdEmbosName,
      customerId: custId,
      expirationDate: cardExpDt,
      originalIssueDate: origIssueDt,
      lastActivityDate: lastActDt,
      atmDailyLimitCents: atmLmt ? dollarsToCents(parseFloat(atmLmt)) : null,
      posDailyLimitCents: posLmt ? dollarsToCents(parseFloat(posLmt)) : null,
      foreignTransactionsAllowed: allowForn === 'true',
      digitalWalletAllowed: allowDigital === 'true',
      invalidPinAttempts: invalidPin ? parseInt(invalidPin, 10) : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Lock card — EFTCardMod with HotCard/WarmCard status
  // ---------------------------------------------------------------------------

  async lockCard(request: LockCardRequest): Promise<Card> {
    if (this.sandbox) {
      const { MockCardAdapter } = await import('./mock-adapter.ts');
      return new MockCardAdapter().lockCard(request);
    }

    const suffixElement = request.cardSuffix
      ? `<jx:EFTCardSufxNum>${escapeXml(request.cardSuffix)}</jx:EFTCardSufxNum>`
      : '';

    const reasonMsg = request.reasonMessage
      ? `<jx:CardStatRsnMsg>${escapeXml(request.reasonMessage)}</jx:CardStatRsnMsg>`
      : '';

    const envelope = soapEnvelope(
      `<jx:EFTCardModRq>
        ${msgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'CARD_LOCK')}
        <jx:EFTCardNum>${escapeXml(request.cardNumber)}</jx:EFTCardNum>
        ${suffixElement}
        <jx:EFTCardModRec>
          <jx:EFTCardStatType>${mapLockReasonToStatus(request.reason)}</jx:EFTCardStatType>
          <jx:CardStatRsnType>${mapLockReasonToISO(request.reason)}</jx:CardStatRsnType>
          ${reasonMsg}
          <jx:CrtEFTCardAlertMsg>true</jx:CrtEFTCardAlertMsg>
        </jx:EFTCardModRec>
      </jx:EFTCardModRq>`,
    );

    await this.soapRequest('EFTCardService', 'EFTCardMod', envelope);

    // Return updated card state by re-inquiring
    return this.getCard({
      tenantId: request.tenantId,
      cardNumber: request.cardNumber,
      cardSuffix: request.cardSuffix,
    });
  }

  // ---------------------------------------------------------------------------
  // Unlock card — EFTCardMod with Act status
  // ---------------------------------------------------------------------------

  async unlockCard(request: UnlockCardRequest): Promise<Card> {
    if (this.sandbox) {
      const { MockCardAdapter } = await import('./mock-adapter.ts');
      return new MockCardAdapter().unlockCard(request);
    }

    const suffixElement = request.cardSuffix
      ? `<jx:EFTCardSufxNum>${escapeXml(request.cardSuffix)}</jx:EFTCardSufxNum>`
      : '';

    const envelope = soapEnvelope(
      `<jx:EFTCardModRq>
        ${msgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'CARD_UNLOCK')}
        <jx:EFTCardNum>${escapeXml(request.cardNumber)}</jx:EFTCardNum>
        ${suffixElement}
        <jx:EFTCardModRec>
          <jx:EFTCardStatType>Act</jx:EFTCardStatType>
        </jx:EFTCardModRec>
      </jx:EFTCardModRq>`,
    );

    await this.soapRequest('EFTCardService', 'EFTCardMod', envelope);

    return this.getCard({
      tenantId: request.tenantId,
      cardNumber: request.cardNumber,
      cardSuffix: request.cardSuffix,
    });
  }

  // ---------------------------------------------------------------------------
  // Set card limits — EFTCardMod with ATM/POS limit amounts
  // ---------------------------------------------------------------------------

  async setCardLimit(request: SetCardLimitRequest): Promise<Card> {
    if (this.sandbox) {
      const { MockCardAdapter } = await import('./mock-adapter.ts');
      return new MockCardAdapter().setCardLimit(request);
    }

    const suffixElement = request.cardSuffix
      ? `<jx:EFTCardSufxNum>${escapeXml(request.cardSuffix)}</jx:EFTCardSufxNum>`
      : '';

    // Build limit elements based on whether they're temporary or permanent
    const isTemporary = !!request.temporaryEndDate;
    let limitElements = '';

    if (request.atmDailyLimitCents != null) {
      const atmDollars = (request.atmDailyLimitCents / 100).toFixed(2);
      if (isTemporary) {
        limitElements += `
          <jx:ATMDrTempPostLmtAmt>${atmDollars}</jx:ATMDrTempPostLmtAmt>
          <jx:ATMDrTempPostStartDt>${new Date().toISOString().split('T')[0]}</jx:ATMDrTempPostStartDt>
          <jx:ATMDrTempPostEndDt>${request.temporaryEndDate!.split('T')[0]}</jx:ATMDrTempPostEndDt>`;
      } else {
        limitElements += `<jx:ATMDrPostLmtAmt>${atmDollars}</jx:ATMDrPostLmtAmt>`;
      }
    }

    if (request.posDailyLimitCents != null) {
      const posDollars = (request.posDailyLimitCents / 100).toFixed(2);
      if (isTemporary) {
        limitElements += `
          <jx:POSDrTempPostLmtAmt>${posDollars}</jx:POSDrTempPostLmtAmt>
          <jx:POSDrTempPostStartDt>${new Date().toISOString().split('T')[0]}</jx:POSDrTempPostStartDt>
          <jx:POSDrTempPostEndDt>${request.temporaryEndDate!.split('T')[0]}</jx:POSDrTempPostEndDt>`;
      } else {
        limitElements += `<jx:POSDrPostLmtAmt>${posDollars}</jx:POSDrPostLmtAmt>`;
      }
    }

    const envelope = soapEnvelope(
      `<jx:EFTCardModRq>
        ${msgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'CARD_LIMIT')}
        <jx:EFTCardNum>${escapeXml(request.cardNumber)}</jx:EFTCardNum>
        ${suffixElement}
        <jx:EFTCardModRec>
          ${limitElements}
        </jx:EFTCardModRec>
      </jx:EFTCardModRq>`,
    );

    await this.soapRequest('EFTCardService', 'EFTCardMod', envelope);

    return this.getCard({
      tenantId: request.tenantId,
      cardNumber: request.cardNumber,
      cardSuffix: request.cardSuffix,
    });
  }

  // ---------------------------------------------------------------------------
  // Card transaction history — EFTCardTrnHistSrch
  // ---------------------------------------------------------------------------

  async listCardTransactions(request: ListCardTransactionsRequest): Promise<ListCardTransactionsResponse> {
    if (this.sandbox) {
      const { MockCardAdapter } = await import('./mock-adapter.ts');
      return new MockCardAdapter().listCardTransactions(request);
    }

    const suffixElement = request.cardSuffix
      ? `<jx:EFTCardSufxNum>${escapeXml(request.cardSuffix)}</jx:EFTCardSufxNum>`
      : '';
    const startElement = request.startDate
      ? `<jx:StartTimeDt>${escapeXml(request.startDate)}</jx:StartTimeDt>`
      : '';
    const endElement = request.endDate
      ? `<jx:EndTimeDt>${escapeXml(request.endDate)}</jx:EndTimeDt>`
      : '';

    const maxRec = request.limit ?? 50;

    const envelope = soapEnvelope(
      `<jx:EFTCardTrnHistSrchRq>
        ${srchMsgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'CARD_TXN_HIST', maxRec)}
        <jx:EFTCardNum>${escapeXml(request.cardNumber)}</jx:EFTCardNum>
        ${suffixElement}
        ${startElement}
        ${endElement}
      </jx:EFTCardTrnHistSrchRq>`,
    );

    try {
      const response = await this.soapRequest('EFTCardService', 'EFTCardTrnHistSrch', envelope);

      const trnElements = extractXmlElements(response, 'EFTCardHistSrchRec');
      const maskedNum = maskCardNumber(request.cardNumber);

      const transactions: CardTransaction[] = trnElements.map((trnXml, index) => {
        const seqId = extractXmlValue(trnXml, 'EFTTrnSeqId')
          ?? extractXmlValue(trnXml, 'EFTSwchSeqId')
          ?? String(index);
        const trnCode = extractXmlValue(trnXml, 'EFTTrnCode');
        const trnDesc = extractXmlValue(trnXml, 'EFTTrnDesc');
        const trnAmt = parseFloat(extractXmlValue(trnXml, 'EFTTrnAmt') ?? '0');
        const trnDt = extractXmlValue(trnXml, 'EFTTrnDt') ?? '';
        const trnTime = extractXmlValue(trnXml, 'EFTTrnTime');
        const sttlDt = extractXmlValue(trnXml, 'TrnSttlDt');
        const merName = extractXmlValue(trnXml, 'MerName');
        const sicCode = extractXmlValue(trnXml, 'StdIndustCode');
        const trnStat = extractXmlValue(trnXml, 'EFTTrnStat')
          ?? extractXmlValue(trnXml, 'EFTTrnStatDesc');
        const recurType = extractXmlValue(trnXml, 'RecurTrnType');

        // Build description from EftDesc array or fall back to trnDesc
        const eftDescs = extractXmlElements(trnXml, 'EftDesc');
        const description = eftDescs.length > 0
          ? eftDescs.map(d => extractXmlValue(d, 'EftDesc')).filter(Boolean).join(' - ')
          : (trnDesc ?? trnCode ?? 'EFT Transaction');

        const transactionDate = trnTime
          ? `${trnDt}T${trnTime}`
          : trnDt;

        return {
          transactionId: seqId,
          cardNumberMasked: maskedNum,
          type: mapTransactionType(trnCode, trnDesc),
          status: mapTransactionStatus(trnStat, !!sttlDt),
          amountCents: dollarsToCents(Math.abs(trnAmt)),
          merchantName: merName,
          merchantCategoryCode: sicCode,
          transactionDate,
          settlementDate: sttlDt ?? null,
          description,
          isRecurring: recurType === 'true',
        };
      });

      const moreRec = extractXmlValue(response, 'MoreRec');
      const totRec = extractXmlValue(response, 'TotRec');

      return {
        transactions,
        total: totRec ? parseInt(totRec, 10) : transactions.length,
        hasMore: moreRec === 'true',
      };
    } catch {
      // If transaction retrieval fails, return empty rather than crash
      return { transactions: [], total: 0, hasMore: false };
    }
  }

  // ---------------------------------------------------------------------------
  // Activate card — EFTCardOrderAdd with IssAct type
  // ---------------------------------------------------------------------------

  async activateCard(request: ActivateCardRequest): Promise<Card> {
    if (this.sandbox) {
      const { MockCardAdapter } = await import('./mock-adapter.ts');
      return new MockCardAdapter().activateCard(request);
    }

    const suffixElement = request.cardSuffix
      ? `<jx:EFTCardSufxNum>${escapeXml(request.cardSuffix)}</jx:EFTCardSufxNum>`
      : '';

    const envelope = soapEnvelope(
      `<jx:EFTCardOrderAddRq>
        ${msgRqHdr(this.instRtId, this.username, this.password, this.consumerName, this.consumerProd, 'CARD_ACTIVATE')}
        <jx:EFTCardNum>${escapeXml(request.cardNumber)}</jx:EFTCardNum>
        ${suffixElement}
        <jx:EFTCardOrderType>IssAct</jx:EFTCardOrderType>
        <jx:EFTCardOrderInfoRec/>
      </jx:EFTCardOrderAddRq>`,
    );

    await this.soapRequest('EFTCardService', 'EFTCardOrderAdd', envelope);

    return this.getCard({
      tenantId: request.tenantId,
      cardNumber: request.cardNumber,
      cardSuffix: request.cardSuffix,
    });
  }
}
