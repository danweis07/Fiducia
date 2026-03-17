// TODO: Provisional integration — not yet validated in production.
/**
 * JHA iPay Solutions Bill Pay Adapter
 *
 * Integrates with Jack Henry & Associates' iPay Solutions bill payment
 * platform via the jXchange SOAP/XML middleware layer.
 *
 * API Reference: JHA Bill Pay Services API User Guide (Release 2018.7.07)
 *
 * Key concepts:
 *   - jXchange: SOAP/XML middleware — all operations are XML request/response
 *   - WS-Security: SAML V2.0 assertions for user identification
 *   - InstRtId: Institution routing/transit ID (required on every request)
 *   - SubId: iPay subscriber ID (resolved per user)
 *   - Payment models: Process Date vs Due Date model
 *   - Check funding: SubDrft, BilPayPrvdDrft (iPay check), InstDrft
 *   - Parallel error handling (multiple errors returned per request)
 *
 * Service Operations mapped:
 *   searchBillers    → BilPayPayeeSrch (payee directory search)
 *   enrollPayee      → BilPayPayeeAdd (add payee for subscriber)
 *   listPayees       → BilPayPayeeSrch (subscriber's enrolled payees)
 *   schedulePayment  → BilPaySchedPmtAdd (schedule a payment)
 *   cancelPayment    → BilPaySchedPmtMod (cancel/stop a scheduled payment)
 *   getPaymentStatus → BilPayPmtHistInq (payment history inquiry)
 *   listPayments     → BilPayPmtHistSrch (payment history search)
 *   listEBills       → BilPayElecBilSchedSrch (electronic bill search)
 *
 * Configuration:
 *   JHA_CONSUMER_NAME — jXchange consumer name
 *   JHA_CONSUMER_PROD — jXchange consumer product identifier
 *   JHA_INST_RT_ID — Institution routing/transit ID
 *   JHA_BASE_URL — jXchange endpoint URL
 *   JHA_SAML_CERT — SAML signing certificate (base64)
 *   JHA_SAML_KEY — SAML signing private key (base64)
 *
 * Sandbox mode auto-enabled when credentials are not configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  BillPayAdapter,
  Payee,
  Payment,
  SearchBillersRequest,
  SearchBillersResponse,
  EnrollPayeeRequest,
  EnrollPayeeResponse,
  ListPayeesRequest,
  ListPayeesResponse,
  SchedulePaymentRequest,
  SchedulePaymentResponse,
  CancelPaymentRequest,
  CancelPaymentResponse,
  GetPaymentStatusRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  ListEBillsRequest,
  ListEBillsResponse,
  PaymentStatus,
  PaymentMethod,
  BillerCategory,
} from './types.ts';

// =============================================================================
// JHA jXchange SOAP TYPES
// =============================================================================

/** jXchange standard message header fields */
interface JXchangeMsgHeader {
  jXchangeHdr: {
    JxVer: string;
    AuditUsrId: string;
    AuditWsId: string;
    ConsumerName: string;
    ConsumerProd: string;
    InstRtId: string;
    InstEnv: string;
  };
}

/** jXchange standard error/status in response */
interface _JXchangeStatus {
  StatusCode?: string;
  StatusDesc?: string;
  Severity?: 'Error' | 'Warning' | 'Info';
}

/** BilPayPayeeSrch response payee record */
interface _JHAPayeeRecord {
  PayeeId: string;
  PayeeClsf: 'Comp' | 'Indv' | 'FinInst';
  PayeeName: string;
  PayeeNickname?: string;
  PayeeAcctNum?: string;
  PayeeAcctNumMasked?: string;
  PayeeCat?: string;
  ElecBilSvcInd?: boolean;
  RushPmtInd?: boolean;
  LeadDays?: string;
  PayeeAddr?: {
    Addr1?: string;
    City?: string;
    StateProv?: string;
    PostalCode?: string;
  };
  SubId?: string;
  ActDtTm?: string;
}

/** BilPaySchedPmt record */
interface _JHAScheduledPayment {
  PmtId: string;
  PayeeId: string;
  SubId: string;
  PmtAmt: string;
  PmtStat: JHAPaymentStatus;
  SchedDt: string;
  ProcDt?: string;
  DlvDt?: string;
  ChkFundModel?: 'SubDrft' | 'BilPayPrvdDrft' | 'InstDrft';
  ConfNum?: string;
  Memo?: string;
  Freq?: string;
  SrcAcctId?: string;
  ActDtTm?: string;
  ErrDesc?: string;
}

/** BilPayPmtHist record */
interface _JHAPaymentHistory {
  PmtId: string;
  PayeeId: string;
  SubId: string;
  PmtAmt: string;
  PmtStat: JHAPaymentStatus;
  SchedDt: string;
  ProcDt?: string;
  DlvDt?: string;
  ConfNum?: string;
  Memo?: string;
  Freq?: string;
  SrcAcctId?: string;
  ActDtTm?: string;
  ChkNum?: string;
  ErrDesc?: string;
}

/** BilPayElecBilSched record */
interface _JHAElectronicBill {
  ElecBilId: string;
  PayeeId: string;
  BilAmt: string;
  MinPmtAmt?: string;
  DueDt: string;
  StmtDt: string;
  BilStat: string;
  BalAmt?: string;
  StmtUrl?: string;
}

/** iPay payment status values */
type JHAPaymentStatus =
  | 'Sched'        // Scheduled
  | 'Pend'         // Pending
  | 'Proc'         // Processing
  | 'Pd'           // Paid
  | 'Stop'         // Stopped
  | 'Canc'         // Cancelled
  | 'ReSbm'        // Resubmitted
  | 'Rfd'          // Refunded
  | 'Skip'         // Skipped
  | 'PmtApprvReq'  // Payment Approval Required
  | 'PmtApprv';    // Payment Approved

/** BilPaySubConsmCust inquiry response */
interface _JHASubscriber {
  SubId: string;
  CustId: string;
  SubStat: string;
  SubType: 'Indv' | 'Comp';
  SubName: string;
  Email?: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapJHAPaymentStatus(status: JHAPaymentStatus): PaymentStatus {
  switch (status) {
    case 'Sched':
    case 'PmtApprvReq':
    case 'PmtApprv':
      return 'scheduled';
    case 'Pend':
    case 'Proc':
    case 'ReSbm':
      return 'processing';
    case 'Pd':
      return 'paid';
    case 'Stop':
    case 'Canc':
    case 'Skip':
      return 'canceled';
    case 'Rfd':
      return 'returned';
    default:
      return 'scheduled';
  }
}

function mapJHAPayeeCategory(classification: string, category?: string): BillerCategory {
  if (classification === 'FinInst') return 'other';

  const cat = (category ?? '').toLowerCase();
  if (cat.includes('util')) return 'utilities';
  if (cat.includes('tele') || cat.includes('phone') || cat.includes('internet') || cat.includes('cable')) return 'telecom';
  if (cat.includes('insur')) return 'insurance';
  if (cat.includes('credit') || cat.includes('card')) return 'credit_card';
  if (cat.includes('mortg')) return 'mortgage';
  if (cat.includes('auto') && cat.includes('loan')) return 'auto_loan';
  if (cat.includes('student') || cat.includes('educ')) return 'student_loan';
  if (cat.includes('gov') || cat.includes('tax')) return 'government';
  if (cat.includes('med') || cat.includes('health')) return 'medical';
  if (cat.includes('subscr') || cat.includes('stream')) return 'subscription';
  return 'other';
}

function mapJHAPaymentMethod(chkFundModel?: string): PaymentMethod {
  switch (chkFundModel) {
    case 'SubDrft':
      return 'check';
    case 'BilPayPrvdDrft':
    case 'InstDrft':
      return 'electronic';
    default:
      return 'electronic';
  }
}

/** Convert dollar string from JHA to integer cents */
function dollarsToCents(amount: string): number {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/** Convert integer cents to JHA dollar string */
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format a date string as YYYY-MM-DD for jXchange */
function toJXchangeDate(dateStr: string): string {
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

// =============================================================================
// SOAP/XML HELPERS
// =============================================================================

/**
 * Build a SOAP envelope for jXchange requests.
 *
 * jXchange expects WS-Security headers with SAML assertions and
 * a structured XML body for each service operation.
 */
function buildSoapEnvelope(
  operation: string,
  header: JXchangeMsgHeader,
  bodyXml: string,
  samlAssertion?: string,
): string {
  const securityHeader = samlAssertion
    ? `<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        ${samlAssertion}
       </wsse:Security>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:jx="http://www.jackhenry.com/jxchange/TPG/2008">
  <soapenv:Header>
    ${securityHeader}
    <jx:jXchangeHdr>
      <jx:JxVer>${escapeXml(header.jXchangeHdr.JxVer)}</jx:JxVer>
      <jx:AuditUsrId>${escapeXml(header.jXchangeHdr.AuditUsrId)}</jx:AuditUsrId>
      <jx:AuditWsId>${escapeXml(header.jXchangeHdr.AuditWsId)}</jx:AuditWsId>
      <jx:ConsumerName>${escapeXml(header.jXchangeHdr.ConsumerName)}</jx:ConsumerName>
      <jx:ConsumerProd>${escapeXml(header.jXchangeHdr.ConsumerProd)}</jx:ConsumerProd>
      <jx:InstRtId>${escapeXml(header.jXchangeHdr.InstRtId)}</jx:InstRtId>
      <jx:InstEnv>${escapeXml(header.jXchangeHdr.InstEnv)}</jx:InstEnv>
    </jx:jXchangeHdr>
  </soapenv:Header>
  <soapenv:Body>
    <jx:${operation}>
      ${bodyXml}
    </jx:${operation}>
  </soapenv:Body>
</soapenv:Envelope>`;
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
 * Minimal XML parser — extracts values from jXchange responses.
 *
 * jXchange returns structured XML. We use regex-based extraction
 * since we're in a Deno edge function without a full DOM parser.
 */
function extractXmlValue(xml: string, tag: string): string | undefined {
  // Match both namespaced (jx:Tag) and non-namespaced (Tag) elements
  const pattern = new RegExp(`<(?:[a-z]+:)?${tag}[^>]*>([^<]*)<\\/(?:[a-z]+:)?${tag}>`, 'i');
  const match = xml.match(pattern);
  return match ? match[1].trim() : undefined;
}

function _extractXmlBlock(xml: string, tag: string): string | undefined {
  const pattern = new RegExp(
    `<(?:[a-z]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-z]+:)?${tag}>`,
    'i',
  );
  const match = xml.match(pattern);
  return match ? match[1].trim() : undefined;
}

function extractAllXmlBlocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(
    `<(?:[a-z]+:)?${tag}[^>]*>[\\s\\S]*?<\\/(?:[a-z]+:)?${tag}>`,
    'gi',
  );
  return xml.match(pattern) ?? [];
}

function extractXmlBool(xml: string, tag: string): boolean {
  const val = extractXmlValue(xml, tag);
  return val === 'true' || val === '1' || val === 'Y';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class JHABillPayAdapter implements BillPayAdapter {
  private readonly consumerName: string;
  private readonly consumerProd: string;
  private readonly instRtId: string;
  private readonly baseUrl: string;
  private readonly instEnv: string;
  private readonly samlCert: string;
  private readonly samlKey: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'jha',
    name: 'JHA iPay Solutions Bill Pay',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 }, // SOAP calls can be slower
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(consumerName?: string, instRtId?: string, baseUrl?: string) {
    this.consumerName = consumerName ?? Deno.env.get('JHA_CONSUMER_NAME') ?? '';
    this.consumerProd = Deno.env.get('JHA_CONSUMER_PROD') ?? 'BillPay';
    this.instRtId = instRtId ?? Deno.env.get('JHA_INST_RT_ID') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('JHA_BASE_URL') ?? 'https://jxchange.jackhenry.com';
    this.instEnv = Deno.env.get('JHA_INST_ENV') ?? 'Prod';
    this.samlCert = Deno.env.get('JHA_SAML_CERT') ?? '';
    this.samlKey = Deno.env.get('JHA_SAML_KEY') ?? '';
    this.sandbox = !this.consumerName || !this.instRtId;
  }

  // ---------------------------------------------------------------------------
  // jXchange transport
  // ---------------------------------------------------------------------------

  private buildHeader(): JXchangeMsgHeader {
    return {
      jXchangeHdr: {
        JxVer: 'R2018.7.07',
        AuditUsrId: 'BillPayAdapter',
        AuditWsId: 'EdgeFunction',
        ConsumerName: this.consumerName,
        ConsumerProd: this.consumerProd,
        InstRtId: this.instRtId,
        InstEnv: this.instEnv,
      },
    };
  }

  /**
   * Execute a jXchange SOAP operation and return the raw XML response body.
   */
  private async soapRequest(operation: string, bodyXml: string): Promise<string> {
    if (this.sandbox) {
      throw new Error('JHA adapter in sandbox mode — no credentials configured');
    }

    const envelope = buildSoapEnvelope(operation, this.buildHeader(), bodyXml);

    const res = await fetch(`${this.baseUrl}/jxchange/2008/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://www.jackhenry.com/jxchange/TPG/2008/${operation}`,
      },
      body: envelope,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`JHA jXchange error (${res.status}): ${errBody.substring(0, 500)}`);
    }

    const responseXml = await res.text();

    // Check for SOAP fault
    const faultString = extractXmlValue(responseXml, 'faultstring');
    if (faultString) {
      throw new Error(`JHA SOAP fault: ${faultString}`);
    }

    // Check for jXchange-level errors (Severity=Error)
    const severity = extractXmlValue(responseXml, 'Severity');
    if (severity === 'Error') {
      const statusDesc = extractXmlValue(responseXml, 'StatusDesc') ?? 'Unknown jXchange error';
      throw new Error(`JHA jXchange error: ${statusDesc}`);
    }

    return responseXml;
  }

  // ---------------------------------------------------------------------------
  // BillPayAdapter interface
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode (no credentials)',
      };
    }

    try {
      // Use SvcDictSrch as a health check — lightweight service dictionary lookup
      await this.soapRequest('SvcDictSrch', `
        <jx:SvcDictSrchRq>
          <jx:SvcNm>BilPayPayeeSrch</jx:SvcNm>
        </jx:SvcDictSrchRq>
      `);
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

  async searchBillers(request: SearchBillersRequest): Promise<SearchBillersResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().searchBillers(request);
    }

    const maxResults = request.limit ?? 20;
    const bodyXml = `
      <jx:BilPayPayeeSrchRq>
        <jx:PayeeName>${escapeXml(request.query)}</jx:PayeeName>
        ${request.zipCode ? `<jx:PostalCode>${escapeXml(request.zipCode)}</jx:PostalCode>` : ''}
        <jx:MaxRec>${maxResults}</jx:MaxRec>
        <jx:SrchType>Dir</jx:SrchType>
      </jx:BilPayPayeeSrchRq>
    `;

    const responseXml = await this.soapRequest('BilPayPayeeSrch', bodyXml);
    const payeeBlocks = extractAllXmlBlocks(responseXml, 'BilPayPayeeRec');

    const billers = payeeBlocks.map(block => {
      const classification = extractXmlValue(block, 'PayeeClsf') ?? 'Comp';
      const category = extractXmlValue(block, 'PayeeCat');
      return {
        billerId: extractXmlValue(block, 'PayeeId') ?? '',
        name: extractXmlValue(block, 'PayeeName') ?? '',
        shortName: extractXmlValue(block, 'PayeeNickname'),
        category: mapJHAPayeeCategory(classification, category),
        supportsEBill: extractXmlBool(block, 'ElecBilSvcInd'),
        supportsRushPayment: extractXmlBool(block, 'RushPmtInd'),
        processingDays: parseInt(extractXmlValue(block, 'LeadDays') ?? '3', 10),
        enrollmentFields: [{
          name: 'accountNumber',
          label: 'Account Number',
          type: 'account_number' as const,
          required: true,
        }],
      };
    });

    return {
      billers,
      totalCount: billers.length,
    };
  }

  async enrollPayee(request: EnrollPayeeRequest): Promise<EnrollPayeeResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().enrollPayee(request);
    }

    // First resolve the subscriber ID for this user
    const subId = await this.resolveSubscriberId(request.userId, request.tenantId);

    const bodyXml = `
      <jx:BilPayPayeeAddRq>
        <jx:SubId>${escapeXml(subId)}</jx:SubId>
        <jx:PayeeId>${escapeXml(request.billerId)}</jx:PayeeId>
        <jx:PayeeAcctNum>${escapeXml(request.accountNumber)}</jx:PayeeAcctNum>
        ${request.nickname ? `<jx:PayeeNickname>${escapeXml(request.nickname)}</jx:PayeeNickname>` : ''}
      </jx:BilPayPayeeAddRq>
    `;

    const responseXml = await this.soapRequest('BilPayPayeeAdd', bodyXml);

    return {
      payee: this.parsePayeeFromXml(responseXml),
    };
  }

  async listPayees(request: ListPayeesRequest): Promise<ListPayeesResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listPayees(request);
    }

    const subId = await this.resolveSubscriberId(request.userId, request.tenantId);

    const bodyXml = `
      <jx:BilPayPayeeSrchRq>
        <jx:SubId>${escapeXml(subId)}</jx:SubId>
        <jx:SrchType>Sub</jx:SrchType>
        <jx:MaxRec>100</jx:MaxRec>
      </jx:BilPayPayeeSrchRq>
    `;

    const responseXml = await this.soapRequest('BilPayPayeeSrch', bodyXml);
    const payeeBlocks = extractAllXmlBlocks(responseXml, 'BilPayPayeeRec');

    return {
      payees: payeeBlocks.map(block => this.parsePayeeRecordFromXml(block)),
    };
  }

  async schedulePayment(request: SchedulePaymentRequest): Promise<SchedulePaymentResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().schedulePayment(request);
    }

    const subId = await this.resolveSubscriberId(request.userId, request.tenantId);

    const freqXml = request.recurringRule
      ? `<jx:Freq>${this.mapFrequencyToJHA(request.recurringRule.frequency)}</jx:Freq>
         ${request.recurringRule.endDate ? `<jx:EndDt>${toJXchangeDate(request.recurringRule.endDate)}</jx:EndDt>` : ''}`
      : '';

    const bodyXml = `
      <jx:BilPaySchedPmtAddRq>
        <jx:SubId>${escapeXml(subId)}</jx:SubId>
        <jx:PayeeId>${escapeXml(request.payeeId)}</jx:PayeeId>
        <jx:SrcAcctId>${escapeXml(request.fromAccountId)}</jx:SrcAcctId>
        <jx:PmtAmt>${centsToDollars(request.amountCents)}</jx:PmtAmt>
        <jx:SchedDt>${toJXchangeDate(request.scheduledDate)}</jx:SchedDt>
        ${request.memo ? `<jx:Memo>${escapeXml(request.memo)}</jx:Memo>` : ''}
        ${freqXml}
      </jx:BilPaySchedPmtAddRq>
    `;

    const responseXml = await this.soapRequest('BilPaySchedPmtAdd', bodyXml);

    return {
      payment: this.parsePaymentFromXml(responseXml),
    };
  }

  async cancelPayment(request: CancelPaymentRequest): Promise<CancelPaymentResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().cancelPayment(request);
    }

    // JHA cancels via BilPaySchedPmtMod with PmtStat set to 'Canc'
    const bodyXml = `
      <jx:BilPaySchedPmtModRq>
        <jx:PmtId>${escapeXml(request.providerPaymentId)}</jx:PmtId>
        <jx:PmtStat>Canc</jx:PmtStat>
      </jx:BilPaySchedPmtModRq>
    `;

    const responseXml = await this.soapRequest('BilPaySchedPmtMod', bodyXml);
    const payment = this.parsePaymentFromXml(responseXml);

    return {
      success: payment.status === 'canceled',
      payment,
    };
  }

  async getPaymentStatus(request: GetPaymentStatusRequest): Promise<Payment> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().getPaymentStatus(request);
    }

    const bodyXml = `
      <jx:BilPayPmtHistInqRq>
        <jx:PmtId>${escapeXml(request.providerPaymentId)}</jx:PmtId>
      </jx:BilPayPmtHistInqRq>
    `;

    const responseXml = await this.soapRequest('BilPayPmtHistInq', bodyXml);
    return this.parsePaymentFromXml(responseXml);
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listPayments(request);
    }

    const subId = await this.resolveSubscriberId(request.userId, request.tenantId);
    const maxRec = request.limit ?? 50;

    const bodyXml = `
      <jx:BilPayPmtHistSrchRq>
        <jx:SubId>${escapeXml(subId)}</jx:SubId>
        ${request.payeeId ? `<jx:PayeeId>${escapeXml(request.payeeId)}</jx:PayeeId>` : ''}
        ${request.fromDate ? `<jx:StartDt>${toJXchangeDate(request.fromDate)}</jx:StartDt>` : ''}
        ${request.toDate ? `<jx:EndDt>${toJXchangeDate(request.toDate)}</jx:EndDt>` : ''}
        ${request.status ? `<jx:PmtStat>${this.mapStatusToJHA(request.status)}</jx:PmtStat>` : ''}
        <jx:MaxRec>${maxRec}</jx:MaxRec>
      </jx:BilPayPmtHistSrchRq>
    `;

    const responseXml = await this.soapRequest('BilPayPmtHistSrch', bodyXml);
    const pmtBlocks = extractAllXmlBlocks(responseXml, 'BilPayPmtHistRec');

    const payments = pmtBlocks.map(block => this.parsePaymentRecordFromXml(block));

    return {
      payments,
      totalCount: payments.length,
    };
  }

  async listEBills(request: ListEBillsRequest): Promise<ListEBillsResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listEBills(request);
    }

    const subId = await this.resolveSubscriberId(request.userId, request.tenantId);

    const bodyXml = `
      <jx:BilPayElecBilSchedSrchRq>
        <jx:SubId>${escapeXml(subId)}</jx:SubId>
        ${request.payeeId ? `<jx:PayeeId>${escapeXml(request.payeeId)}</jx:PayeeId>` : ''}
      </jx:BilPayElecBilSchedSrchRq>
    `;

    const responseXml = await this.soapRequest('BilPayElecBilSchedSrch', bodyXml);
    const ebillBlocks = extractAllXmlBlocks(responseXml, 'BilPayElecBilRec');

    const eBills = ebillBlocks.map(block => ({
      eBillId: extractXmlValue(block, 'ElecBilId') ?? '',
      payeeId: extractXmlValue(block, 'PayeeId') ?? '',
      amountCents: dollarsToCents(extractXmlValue(block, 'BilAmt') ?? '0'),
      minimumPaymentCents: extractXmlValue(block, 'MinPmtAmt')
        ? dollarsToCents(extractXmlValue(block, 'MinPmtAmt')!)
        : undefined,
      dueDate: extractXmlValue(block, 'DueDt') ?? '',
      statementDate: extractXmlValue(block, 'StmtDt') ?? '',
      status: this.mapEBillStatus(extractXmlValue(block, 'BilStat') ?? ''),
      balanceCents: extractXmlValue(block, 'BalAmt')
        ? dollarsToCents(extractXmlValue(block, 'BalAmt')!)
        : undefined,
      statementUrl: extractXmlValue(block, 'StmtUrl'),
    }));

    return { eBills };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Resolve the iPay subscriber ID for a given user.
   *
   * Uses BilPaySubConsmCustInq to look up the subscriber by customer ID.
   * The SubId is required for most iPay operations.
   */
  private async resolveSubscriberId(userId: string, _tenantId: string): Promise<string> {
    const bodyXml = `
      <jx:BilPaySubConsmCustInqRq>
        <jx:CustId>${escapeXml(userId)}</jx:CustId>
      </jx:BilPaySubConsmCustInqRq>
    `;

    const responseXml = await this.soapRequest('BilPaySubConsmCustInq', bodyXml);
    const subId = extractXmlValue(responseXml, 'SubId');

    if (!subId) {
      throw new Error(`JHA: No iPay subscriber found for user ${userId.substring(0, 8)}...`);
    }

    return subId;
  }

  private parsePayeeFromXml(xml: string): Payee {
    const classification = extractXmlValue(xml, 'PayeeClsf') ?? 'Comp';
    const category = extractXmlValue(xml, 'PayeeCat');

    return {
      payeeId: extractXmlValue(xml, 'PayeeId') ?? '',
      billerId: extractXmlValue(xml, 'PayeeId') ?? '',
      nickname: extractXmlValue(xml, 'PayeeNickname'),
      billerName: extractXmlValue(xml, 'PayeeName') ?? '',
      category: mapJHAPayeeCategory(classification, category),
      accountNumberMasked: extractXmlValue(xml, 'PayeeAcctNumMasked') ?? '****',
      eBillStatus: extractXmlBool(xml, 'ElecBilSvcInd') ? 'active' : 'not_enrolled',
      nextDueDate: extractXmlValue(xml, 'NextDueDt'),
      nextAmountDueCents: extractXmlValue(xml, 'NextPmtAmt')
        ? dollarsToCents(extractXmlValue(xml, 'NextPmtAmt')!)
        : undefined,
      enrolledAt: extractXmlValue(xml, 'ActDtTm') ?? new Date().toISOString(),
      autopayEnabled: extractXmlBool(xml, 'AutoPmtInd'),
    };
  }

  private parsePayeeRecordFromXml(block: string): Payee {
    return this.parsePayeeFromXml(block);
  }

  private parsePaymentFromXml(xml: string): Payment {
    const pmtStat = (extractXmlValue(xml, 'PmtStat') ?? 'Sched') as JHAPaymentStatus;

    return {
      paymentId: extractXmlValue(xml, 'PmtId') ?? '',
      providerPaymentId: extractXmlValue(xml, 'PmtId') ?? '',
      payeeId: extractXmlValue(xml, 'PayeeId') ?? '',
      fromAccountId: extractXmlValue(xml, 'SrcAcctId') ?? '',
      amountCents: dollarsToCents(extractXmlValue(xml, 'PmtAmt') ?? '0'),
      status: mapJHAPaymentStatus(pmtStat),
      scheduledDate: extractXmlValue(xml, 'SchedDt') ?? '',
      processedDate: extractXmlValue(xml, 'ProcDt'),
      deliveryDate: extractXmlValue(xml, 'DlvDt'),
      method: mapJHAPaymentMethod(extractXmlValue(xml, 'ChkFundModel')),
      confirmationNumber: extractXmlValue(xml, 'ConfNum'),
      memo: extractXmlValue(xml, 'Memo'),
      createdAt: extractXmlValue(xml, 'ActDtTm') ?? new Date().toISOString(),
      failureReason: extractXmlValue(xml, 'ErrDesc'),
    };
  }

  private parsePaymentRecordFromXml(block: string): Payment {
    return this.parsePaymentFromXml(block);
  }

  /** Map canonical frequency to JHA frequency code */
  private mapFrequencyToJHA(frequency: string): string {
    switch (frequency) {
      case 'weekly': return 'Wk';
      case 'biweekly': return 'BiWk';
      case 'monthly': return 'Mo';
      case 'quarterly': return 'Qtr';
      case 'annually': return 'Yr';
      default: return 'Once';
    }
  }

  /** Map canonical payment status to JHA status code */
  private mapStatusToJHA(status: PaymentStatus): string {
    switch (status) {
      case 'scheduled': return 'Sched';
      case 'processing': return 'Proc';
      case 'paid': return 'Pd';
      case 'failed': return 'Stop';
      case 'canceled': return 'Canc';
      case 'returned': return 'Rfd';
      default: return 'Sched';
    }
  }

  /** Map JHA eBill status to canonical status */
  private mapEBillStatus(bilStat: string): 'unpaid' | 'partial' | 'paid' | 'overdue' {
    switch (bilStat.toLowerCase()) {
      case 'pd':
      case 'paid':
        return 'paid';
      case 'part':
      case 'partial':
        return 'partial';
      case 'overdue':
      case 'pastdue':
        return 'overdue';
      default:
        return 'unpaid';
    }
  }
}
