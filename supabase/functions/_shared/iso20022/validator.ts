/**
 * ISO 20022 Message Validator
 *
 * Validates ISO 20022 XML messages for structural correctness,
 * required fields, and format compliance.
 *
 * Supports validation of:
 *   - pain.001 (Customer Credit Transfer Initiation)
 *   - pacs.008 (FI to FI Customer Credit Transfer)
 *   - pacs.002 (Payment Status Report)
 *   - camt.053 (Bank to Customer Statement)
 */

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  messageType: string | null;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

// =============================================================================
// VALIDATORS
// =============================================================================

const ISO20022_NAMESPACE = 'urn:iso:std:iso:20022:tech:xsd:';

const SUPPORTED_MESSAGE_TYPES = [
  'pain.001.001.11',
  'pain.002.001.12',
  'pacs.008.001.10',
  'pacs.002.001.12',
  'camt.053.001.10',
] as const;

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** Extract a simple text value from an XML tag */
function extractValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/** Check if a tag exists in the XML */
function hasTag(xml: string, tagName: string): boolean {
  return new RegExp(`<${tagName}[\\s>]`).test(xml);
}

/** Detect message type from namespace */
function detectType(xml: string): string | null {
  const nsMatch = xml.match(/urn:iso:std:iso:20022:tech:xsd:([a-z]+\.\d+\.\d+\.\d+)/);
  return nsMatch ? nsMatch[1] : null;
}

/**
 * Validate an ISO 20022 XML message.
 */
export function validateISO20022Message(xml: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Check for XML declaration
  if (!xml.trimStart().startsWith('<?xml')) {
    errors.push({ field: 'xml', code: 'MISSING_XML_DECLARATION', message: 'Missing XML declaration' });
  }

  // Check for ISO 20022 namespace
  if (!xml.includes(ISO20022_NAMESPACE)) {
    errors.push({ field: 'Document', code: 'MISSING_NAMESPACE', message: 'Missing ISO 20022 namespace' });
    return { valid: false, errors, messageType: null };
  }

  const messageType = detectType(xml);
  if (!messageType) {
    errors.push({ field: 'Document', code: 'UNKNOWN_MESSAGE_TYPE', message: 'Cannot determine message type from namespace' });
    return { valid: false, errors, messageType: null };
  }

  if (!SUPPORTED_MESSAGE_TYPES.includes(messageType as typeof SUPPORTED_MESSAGE_TYPES[number])) {
    errors.push({ field: 'Document', code: 'UNSUPPORTED_MESSAGE_TYPE', message: `Unsupported message type: ${messageType}` });
    return { valid: false, errors, messageType };
  }

  // Validate based on message type
  switch (messageType) {
    case 'pain.001.001.11':
      validatePain001(xml, errors);
      break;
    case 'pacs.008.001.10':
      validatePacs008(xml, errors);
      break;
    case 'pacs.002.001.12':
      validatePacs002(xml, errors);
      break;
    case 'camt.053.001.10':
      validateCamt053(xml, errors);
      break;
  }

  return { valid: errors.length === 0, errors, messageType };
}

// =============================================================================
// MESSAGE-SPECIFIC VALIDATORS
// =============================================================================

function validatePain001(xml: string, errors: ValidationError[]) {
  validateGroupHeader(xml, errors);

  if (!hasTag(xml, 'PmtInf')) {
    errors.push({ field: 'PmtInf', code: 'MISSING_FIELD', message: 'Payment information block is required' });
    return;
  }

  if (!hasTag(xml, 'CdtTrfTxInf')) {
    errors.push({ field: 'CdtTrfTxInf', code: 'MISSING_FIELD', message: 'Credit transfer transaction info is required' });
  }

  // Validate debtor
  if (!hasTag(xml, 'Dbtr')) {
    errors.push({ field: 'Dbtr', code: 'MISSING_FIELD', message: 'Debtor information is required' });
  }

  // Validate amount
  validateAmount(xml, 'InstdAmt', errors);
}

function validatePacs008(xml: string, errors: ValidationError[]) {
  validateGroupHeader(xml, errors);

  // Settlement info
  if (!hasTag(xml, 'SttlmInf')) {
    errors.push({ field: 'SttlmInf', code: 'MISSING_FIELD', message: 'Settlement information is required' });
  }

  const sttlmMtd = extractValue(xml, 'SttlmMtd');
  if (sttlmMtd && !['CLRG', 'INDA', 'INGA', 'COVE'].includes(sttlmMtd)) {
    errors.push({ field: 'SttlmMtd', code: 'INVALID_VALUE', message: `Invalid settlement method: ${sttlmMtd}` });
  }

  // Transaction info
  if (!hasTag(xml, 'CdtTrfTxInf')) {
    errors.push({ field: 'CdtTrfTxInf', code: 'MISSING_FIELD', message: 'Credit transfer transaction info is required' });
  }

  validateAmount(xml, 'IntrBkSttlmAmt', errors);
}

function validatePacs002(xml: string, errors: ValidationError[]) {
  validateGroupHeader(xml, errors);

  if (!hasTag(xml, 'TxInfAndSts')) {
    errors.push({ field: 'TxInfAndSts', code: 'MISSING_FIELD', message: 'Transaction information and status is required' });
  }

  const txSts = extractValue(xml, 'TxSts');
  if (txSts && !['ACCP', 'ACSC', 'ACSP', 'ACTC', 'ACWC', 'PDNG', 'RCVD', 'RJCT'].includes(txSts)) {
    errors.push({ field: 'TxSts', code: 'INVALID_STATUS', message: `Invalid transaction status: ${txSts}` });
  }
}

function validateCamt053(xml: string, errors: ValidationError[]) {
  validateGroupHeader(xml, errors);

  if (!hasTag(xml, 'Stmt')) {
    errors.push({ field: 'Stmt', code: 'MISSING_FIELD', message: 'Statement block is required' });
  }

  if (!hasTag(xml, 'Bal')) {
    errors.push({ field: 'Bal', code: 'MISSING_FIELD', message: 'At least one balance entry is required' });
  }
}

// =============================================================================
// SHARED VALIDATION HELPERS
// =============================================================================

function validateGroupHeader(xml: string, errors: ValidationError[]) {
  if (!hasTag(xml, 'GrpHdr')) {
    errors.push({ field: 'GrpHdr', code: 'MISSING_FIELD', message: 'Group header is required' });
    return;
  }

  const msgId = extractValue(xml, 'MsgId');
  if (!msgId) {
    errors.push({ field: 'GrpHdr.MsgId', code: 'MISSING_FIELD', message: 'Message ID is required' });
  } else if (msgId.length > 35) {
    errors.push({ field: 'GrpHdr.MsgId', code: 'FIELD_TOO_LONG', message: 'Message ID must not exceed 35 characters' });
  }

  const creDtTm = extractValue(xml, 'CreDtTm');
  if (!creDtTm) {
    errors.push({ field: 'GrpHdr.CreDtTm', code: 'MISSING_FIELD', message: 'Creation date/time is required' });
  } else if (!ISO_DATETIME_RE.test(creDtTm)) {
    errors.push({ field: 'GrpHdr.CreDtTm', code: 'INVALID_FORMAT', message: 'Creation date/time must be ISO 8601 format' });
  }
}

function validateAmount(xml: string, tagName: string, errors: ValidationError[]) {
  const amtMatch = xml.match(new RegExp(`<${tagName}[^>]*Ccy="([^"]*)"[^>]*>([^<]*)</${tagName}>`));
  if (!amtMatch) {
    errors.push({ field: tagName, code: 'MISSING_FIELD', message: `${tagName} is required with Ccy attribute` });
    return;
  }

  const currency = amtMatch[1];
  const value = amtMatch[2].trim();

  if (!CURRENCY_CODE_RE.test(currency)) {
    errors.push({ field: `${tagName}.Ccy`, code: 'INVALID_CURRENCY', message: `Invalid currency code: ${currency}` });
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) {
    errors.push({ field: tagName, code: 'INVALID_AMOUNT', message: 'Amount must be a positive number' });
  }
}

/**
 * Validate a BIC/SWIFT code format.
 */
export function validateBIC(bic: string): boolean {
  return BIC_RE.test(bic.toUpperCase());
}

/**
 * Validate an IBAN format (basic structural check).
 */
export function validateIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return IBAN_RE.test(cleaned);
}

/**
 * Validate an ISO 4217 currency code.
 */
export function validateCurrencyCode(code: string): boolean {
  return CURRENCY_CODE_RE.test(code);
}

/**
 * Validate an ISO date (YYYY-MM-DD).
 */
export function validateISODate(date: string): boolean {
  return ISO_DATE_RE.test(date);
}
