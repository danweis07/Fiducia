/**
 * ISO 20022 Data Mapper
 *
 * Translates internal platform JSON transfer/transaction/statement objects
 * into ISO 20022 MX XML messages for FedNow, SWIFT, and clearinghouse
 * interoperability.
 *
 * Supported message types:
 *   - pain.001.001.11 — Customer Credit Transfer Initiation
 *   - pacs.008.001.10 — FI to FI Customer Credit Transfer
 *   - camt.053.001.10 — Bank to Customer Statement
 *
 * Usage:
 *   import { toISO20022Pain001, toISO20022Pacs008, toISO20022Camt053 } from './mapper.ts';
 *   const xml = toISO20022Pain001(transfer);
 */

import type {
  InternalTransfer,
  InternalStatement,
} from './types.ts';

// =============================================================================
// XML ESCAPING
// =============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert integer cents to decimal string (e.g., 15099 → "150.99") */
function centsToDecimal(cents: number): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${whole}.${frac.toString().padStart(2, '0')}`;
}

/** Convert a decimal string (e.g. "150.99") to integer cents without float precision loss */
function decimalStringToCents(value: string): number {
  const trimmed = value.trim();
  const [whole, frac = ''] = trimmed.split('.');
  const sign = trimmed.startsWith('-') ? -1 : 1;
  const absWhole = whole.replace('-', '');
  const paddedFrac = (frac + '00').slice(0, 2);
  return sign * (parseInt(absWhole, 10) * 100 + parseInt(paddedFrac, 10));
}

/** Format a date string to ISO 20022 date format (YYYY-MM-DD) */
function toISODate(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

/** Format a date string to ISO 20022 datetime format */
function toISODateTime(dateStr: string): string {
  return new Date(dateStr).toISOString();
}

/** Generate a unique message ID */
function generateMessageId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

// =============================================================================
// XML BUILDER HELPERS
// =============================================================================

function tag(name: string, content: string, attrs?: Record<string, string>): string {
  const attrStr = attrs
    ? ' ' + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ')
    : '';
  return `<${name}${attrStr}>${content}</${name}>`;
}

function _optTag(name: string, value: string | undefined | null): string {
  if (!value) return '';
  return tag(name, escapeXml(value));
}

function buildPostalAddress(addr?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string }): string {
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.line1) parts.push(tag('StrtNm', escapeXml(addr.line1)));
  if (addr.postalCode) parts.push(tag('PstCd', escapeXml(addr.postalCode)));
  if (addr.city) parts.push(tag('TwnNm', escapeXml(addr.city)));
  if (addr.state) parts.push(tag('CtrySubDvsn', escapeXml(addr.state)));
  if (addr.country) parts.push(tag('Ctry', escapeXml(addr.country)));
  return parts.length > 0 ? tag('PstlAdr', parts.join('')) : '';
}

function buildAccount(accountNumber?: string, routingNumber?: string, iban?: string, currency?: string): string {
  const parts: string[] = [];
  if (iban) {
    parts.push(tag('Id', tag('IBAN', escapeXml(iban))));
  } else if (accountNumber) {
    const otherId = tag('Id', escapeXml(accountNumber)) +
      tag('SchmeNm', tag('Cd', routingNumber ? 'USABA' : 'BBAN'));
    parts.push(tag('Id', tag('Othr', otherId)));
  }
  if (currency) parts.push(tag('Ccy', escapeXml(currency)));
  return parts.join('');
}

function buildAgent(bic?: string, routingNumber?: string, name?: string): string {
  const fiIdParts: string[] = [];
  if (bic) {
    fiIdParts.push(tag('BICFI', escapeXml(bic)));
  }
  if (routingNumber) {
    fiIdParts.push(tag('ClrSysMmbId',
      tag('ClrSysId', tag('Cd', 'USABA')) +
      tag('MmbId', escapeXml(routingNumber))
    ));
  }
  if (name) fiIdParts.push(tag('Nm', escapeXml(name)));
  return tag('FinInstnId', fiIdParts.join(''));
}

// =============================================================================
// PAIN.001 — Customer Credit Transfer Initiation
// =============================================================================

/**
 * Convert an internal transfer to ISO 20022 pain.001.001.11 XML.
 * Used when a member initiates a credit transfer.
 */
export function toISO20022Pain001(transfer: InternalTransfer): string {
  const messageId = generateMessageId('PAIN001');
  const now = toISODateTime(new Date().toISOString());
  const amount = centsToDecimal(transfer.amountCents);

  const creditTransfer =
    tag('PmtId', tag('EndToEndId', escapeXml(transfer.id))) +
    tag('Amt', tag('InstdAmt', amount, { Ccy: transfer.currency || 'USD' })) +
    tag('Cdtr',
      tag('Nm', escapeXml(transfer.recipientName)) +
      buildPostalAddress(transfer.recipientAddress)
    ) +
    tag('CdtrAcct', buildAccount(transfer.toAccountNumber, transfer.toRoutingNumber)) +
    (transfer.recipientBIC
      ? tag('CdtrAgt', buildAgent(transfer.recipientBIC, transfer.toRoutingNumber))
      : (transfer.toRoutingNumber
        ? tag('CdtrAgt', buildAgent(undefined, transfer.toRoutingNumber))
        : '')) +
    (transfer.memo ? tag('RmtInf', tag('Ustrd', escapeXml(transfer.memo))) : '');

  const payment =
    tag('PmtInfId', escapeXml(`PMT-${transfer.id}`)) +
    tag('PmtMtd', 'TRF') +
    tag('ReqdExctnDt', tag('Dt', toISODate(transfer.requestedDate))) +
    tag('Dbtr',
      tag('Nm', escapeXml(transfer.senderName)) +
      buildPostalAddress(transfer.senderAddress)
    ) +
    tag('DbtrAcct', buildAccount(transfer.fromAccountNumber, transfer.fromRoutingNumber, undefined, transfer.currency || 'USD')) +
    (transfer.senderBIC
      ? tag('DbtrAgt', buildAgent(transfer.senderBIC, transfer.fromRoutingNumber))
      : (transfer.fromRoutingNumber
        ? tag('DbtrAgt', buildAgent(undefined, transfer.fromRoutingNumber))
        : '')) +
    tag('CdtTrfTxInf', creditTransfer);

  const grpHdr =
    tag('MsgId', escapeXml(messageId)) +
    tag('CreDtTm', now) +
    tag('NbOfTxs', '1') +
    tag('CtrlSum', amount) +
    tag('InitgPty', tag('Nm', escapeXml(transfer.senderName)));

  const document =
    tag('GrpHdr', grpHdr) +
    tag('PmtInf', payment);

  return xmlDeclaration() +
    tag('Document', tag('CstmrCdtTrfInitn', document), {
      xmlns: 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.11',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    });
}

// =============================================================================
// PACS.008 — FI to FI Customer Credit Transfer
// =============================================================================

/**
 * Convert an internal transfer to ISO 20022 pacs.008.001.10 XML.
 * Used for interbank settlement (FedNow, SWIFT).
 */
export function toISO20022Pacs008(
  transfer: InternalTransfer,
  options?: { settlementMethod?: 'CLRG' | 'INDA' | 'INGA' | 'COVE' }
): string {
  const messageId = generateMessageId('PACS008');
  const now = toISODateTime(new Date().toISOString());
  const amount = centsToDecimal(transfer.amountCents);
  const settlementMethod = options?.settlementMethod ?? 'CLRG';

  const transaction =
    tag('PmtId',
      tag('InstrId', escapeXml(`INSTR-${transfer.id}`)) +
      tag('EndToEndId', escapeXml(transfer.id)) +
      tag('TxId', escapeXml(`TX-${transfer.id}`))
    ) +
    tag('IntrBkSttlmAmt', amount, { Ccy: transfer.currency || 'USD' }) +
    tag('IntrBkSttlmDt', toISODate(transfer.requestedDate)) +
    tag('ChrgBr', 'SHAR') +
    (transfer.senderBIC || transfer.fromRoutingNumber
      ? tag('InstgAgt', buildAgent(transfer.senderBIC, transfer.fromRoutingNumber))
      : '') +
    (transfer.recipientBIC || transfer.toRoutingNumber
      ? tag('InstdAgt', buildAgent(transfer.recipientBIC, transfer.toRoutingNumber))
      : '') +
    tag('Dbtr',
      tag('Nm', escapeXml(transfer.senderName)) +
      buildPostalAddress(transfer.senderAddress)
    ) +
    tag('DbtrAcct', buildAccount(transfer.fromAccountNumber, transfer.fromRoutingNumber)) +
    tag('Cdtr',
      tag('Nm', escapeXml(transfer.recipientName)) +
      buildPostalAddress(transfer.recipientAddress)
    ) +
    tag('CdtrAcct', buildAccount(transfer.toAccountNumber, transfer.toRoutingNumber)) +
    (transfer.memo ? tag('RmtInf', tag('Ustrd', escapeXml(transfer.memo))) : '');

  const grpHdr =
    tag('MsgId', escapeXml(messageId)) +
    tag('CreDtTm', now) +
    tag('NbOfTxs', '1') +
    tag('SttlmInf', tag('SttlmMtd', settlementMethod));

  const document =
    tag('GrpHdr', grpHdr) +
    tag('CdtTrfTxInf', transaction);

  return xmlDeclaration() +
    tag('Document', tag('FIToFICstmrCdtTrf', document), {
      xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    });
}

// =============================================================================
// CAMT.053 — Bank to Customer Statement
// =============================================================================

/**
 * Convert an internal statement to ISO 20022 camt.053.001.10 XML.
 * Used for account statement reporting.
 */
export function toISO20022Camt053(statement: InternalStatement): string {
  const messageId = generateMessageId('CAMT053');
  const now = toISODateTime(new Date().toISOString());

  const entries = statement.transactions.map((tx) => {
    const cdtDbt = tx.type === 'credit' ? 'CRDT' : 'DBIT';
    const statusCode = tx.status === 'posted' ? 'BOOK' : tx.status === 'pending' ? 'PDNG' : 'INFO';
    const amount = centsToDecimal(Math.abs(tx.amount));

    const details = tx.endToEndId || tx.remittanceInfo || tx.counterpartyName
      ? tag('NtryDtls', tag('TxDtls',
          (tx.endToEndId ? tag('Refs', tag('EndToEndId', escapeXml(tx.endToEndId))) : '') +
          (tx.remittanceInfo ? tag('RmtInf', tag('Ustrd', escapeXml(tx.remittanceInfo))) : '') +
          (tx.counterpartyName
            ? tag('RltdPties',
                tx.type === 'credit'
                  ? tag('Dbtr', tag('Nm', escapeXml(tx.counterpartyName)))
                  : tag('Cdtr', tag('Nm', escapeXml(tx.counterpartyName)))
              )
            : '')
        ))
      : '';

    return tag('Ntry',
      tag('NtryRef', escapeXml(tx.id)) +
      tag('Amt', amount, { Ccy: tx.currency || statement.currency }) +
      tag('CdtDbtInd', cdtDbt) +
      tag('Sts', tag('Cd', statusCode)) +
      tag('BookgDt', tag('Dt', toISODate(tx.bookingDate))) +
      tag('ValDt', tag('Dt', toISODate(tx.valueDate))) +
      (tx.category
        ? tag('BkTxCd', tag('Domn',
            tag('Cd', 'PMNT') +
            tag('Fmly', tag('Cd', 'RCDT') + tag('SubFmlyCd', escapeXml(tx.category)))
          ))
        : '') +
      details
    );
  }).join('');

  const openBal = tag('Bal',
    tag('Tp', tag('CdOrPrtry', tag('Cd', 'OPBD'))) +
    tag('Amt', centsToDecimal(Math.abs(statement.openingBalance)), { Ccy: statement.currency }) +
    tag('CdtDbtInd', statement.openingBalance >= 0 ? 'CRDT' : 'DBIT') +
    tag('Dt', tag('Dt', toISODate(statement.statementDate)))
  );

  const closeBal = tag('Bal',
    tag('Tp', tag('CdOrPrtry', tag('Cd', 'CLBD'))) +
    tag('Amt', centsToDecimal(Math.abs(statement.closingBalance)), { Ccy: statement.currency }) +
    tag('CdtDbtInd', statement.closingBalance >= 0 ? 'CRDT' : 'DBIT') +
    tag('Dt', tag('Dt', toISODate(statement.statementDate)))
  );

  const account = buildAccount(
    statement.accountNumber,
    undefined,
    statement.accountIBAN,
    statement.currency,
  );

  const stmtXml =
    tag('Id', escapeXml(statement.id)) +
    tag('ElctrncSeqNb', '1') +
    tag('CreDtTm', now) +
    tag('Acct', account) +
    openBal + closeBal +
    entries;

  const grpHdr =
    tag('MsgId', escapeXml(messageId)) +
    tag('CreDtTm', now);

  const document =
    tag('GrpHdr', grpHdr) +
    tag('Stmt', stmtXml);

  return xmlDeclaration() +
    tag('Document', tag('BkToCstmrStmt', document), {
      xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.053.001.10',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    });
}

// =============================================================================
// PARSING — XML to Internal Types
// =============================================================================

/**
 * Extract a simple text value from an XML path.
 * Path example: 'Document/CstmrCdtTrfInitn/GrpHdr/MsgId'
 */
function extractXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract all occurrences of a tag's content.
 */
function extractAllXml(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'g');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1]);
  }
  return results;
}

/**
 * Extract amount with currency attribute.
 */
function extractAmount(xml: string, tagName: string): { value: string; currency: string } | null {
  const regex = new RegExp(`<${tagName}[^>]*Ccy="([^"]*)"[^>]*>([^<]*)</${tagName}>`);
  const match = xml.match(regex);
  if (!match) return null;
  return { currency: match[1], value: match[2].trim() };
}

/**
 * Parse a pain.001 XML string into an InternalTransfer.
 * Extracts the first payment/credit transfer.
 */
export function fromISO20022Pain001(xml: string): InternalTransfer | null {
  const cdtTrfs = extractAllXml(xml, 'CdtTrfTxInf');
  if (cdtTrfs.length === 0) return null;

  const txXml = cdtTrfs[0];
  const pmtInfs = extractAllXml(xml, 'PmtInf');
  const pmtXml = pmtInfs.length > 0 ? pmtInfs[0] : xml;

  const endToEndId = extractXmlValue(txXml, 'EndToEndId');
  const amt = extractAmount(txXml, 'InstdAmt');
  const senderName = extractXmlValue(pmtXml, 'Nm') ?? 'Unknown';
  const recipientName = (() => {
    const cdtrBlock = extractAllXml(txXml, 'Cdtr');
    return cdtrBlock.length > 0 ? (extractXmlValue(cdtrBlock[0], 'Nm') ?? 'Unknown') : 'Unknown';
  })();

  const memo = extractXmlValue(txXml, 'Ustrd');
  const reqDate = extractXmlValue(pmtXml, 'Dt');

  // Parse monetary value using string manipulation to avoid float precision issues
  const amountCents = amt ? decimalStringToCents(amt.value) : 0;

  // Extract account identifiers from XML when available
  const dbtrAcct = extractAllXml(pmtXml, 'DbtrAcct');
  const fromAccount = dbtrAcct.length > 0
    ? (extractXmlValue(dbtrAcct[0], 'IBAN') ?? extractXmlValue(dbtrAcct[0], 'Id') ?? '')
    : '';
  const cdtrAcct = extractAllXml(txXml, 'CdtrAcct');
  const toAccount = cdtrAcct.length > 0
    ? (extractXmlValue(cdtrAcct[0], 'IBAN') ?? extractXmlValue(cdtrAcct[0], 'Id') ?? undefined)
    : undefined;

  return {
    id: endToEndId ?? `parsed-${Date.now()}`,
    fromAccountId: fromAccount,
    toAccountId: toAccount,
    amountCents,
    currency: amt?.currency ?? 'USD',
    memo: memo ?? undefined,
    senderName,
    recipientName,
    requestedDate: reqDate ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
    // tenantId must be set by the caller — XML messages don't carry internal tenant info
    tenantId: '',
  };
}

// =============================================================================
// PACS.002 — Payment Status Report
// =============================================================================

/** ISO 20022 transaction status codes */
export type Pacs002StatusCode =
  | 'ACCP'  // Accepted by customer
  | 'ACSC'  // Accepted and settlement completed
  | 'ACSP'  // Accepted and settlement in progress
  | 'ACTC'  // Accepted technical validation
  | 'ACWC'  // Accepted with change
  | 'PDNG'  // Pending
  | 'RCVD'  // Received
  | 'RJCT'; // Rejected

/**
 * Generate a pacs.002.001.12 Payment Status Report XML.
 * Used to report the status of a previously submitted payment.
 */
export function toISO20022Pacs002(params: {
  originalMessageId: string;
  originalMessageType: string;
  transactionId: string;
  endToEndId: string;
  status: Pacs002StatusCode;
  reasonCode?: string;
  reasonInfo?: string;
}): string {
  const messageId = generateMessageId('PACS002');
  const now = toISODateTime(new Date().toISOString());

  const statusReason = params.reasonCode
    ? tag('StsRsnInf',
        tag('Rsn', tag('Cd', escapeXml(params.reasonCode))) +
        (params.reasonInfo ? tag('AddtlInf', escapeXml(params.reasonInfo)) : '')
      )
    : '';

  const txInfAndSts =
    tag('OrgnlInstrId', escapeXml(params.transactionId)) +
    tag('OrgnlEndToEndId', escapeXml(params.endToEndId)) +
    tag('TxSts', params.status) +
    statusReason;

  const grpHdr =
    tag('MsgId', escapeXml(messageId)) +
    tag('CreDtTm', now);

  const orgnlGrpInf =
    tag('OrgnlMsgId', escapeXml(params.originalMessageId)) +
    tag('OrgnlMsgNmId', escapeXml(params.originalMessageType));

  const document =
    tag('GrpHdr', grpHdr) +
    tag('OrgnlGrpInfAndSts', orgnlGrpInf) +
    tag('TxInfAndSts', txInfAndSts);

  return xmlDeclaration() +
    tag('Document', tag('FIToFIPmtStsRpt', document), {
      xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.12',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    });
}

/**
 * Parse a pacs.002 status report XML and extract the transaction status.
 */
export function fromISO20022Pacs002(xml: string): {
  originalMessageId: string;
  transactionId: string;
  endToEndId: string;
  status: string;
  reasonCode: string | null;
  reasonInfo: string | null;
} | null {
  const orgnlMsgId = extractXmlValue(xml, 'OrgnlMsgId');
  const orgnlInstrId = extractXmlValue(xml, 'OrgnlInstrId');
  const orgnlEndToEndId = extractXmlValue(xml, 'OrgnlEndToEndId');
  const txSts = extractXmlValue(xml, 'TxSts');

  if (!txSts) return null;

  const reasonCode = extractXmlValue(xml, 'Cd');
  const reasonInfo = extractXmlValue(xml, 'AddtlInf');

  return {
    originalMessageId: orgnlMsgId ?? '',
    transactionId: orgnlInstrId ?? '',
    endToEndId: orgnlEndToEndId ?? '',
    status: txSts,
    reasonCode: reasonCode ?? null,
    reasonInfo: reasonInfo ?? null,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function xmlDeclaration(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n';
}

/**
 * Validate that an XML string contains a known ISO 20022 namespace.
 */
export function isISO20022Message(xml: string): boolean {
  return xml.includes('urn:iso:std:iso:20022:tech:xsd:');
}

/**
 * Detect the ISO 20022 message type from XML.
 */
export function detectMessageType(xml: string): string | null {
  const nsMatch = xml.match(/urn:iso:std:iso:20022:tech:xsd:([a-z]+\.\d+\.\d+\.\d+)/);
  return nsMatch ? nsMatch[1] : null;
}
