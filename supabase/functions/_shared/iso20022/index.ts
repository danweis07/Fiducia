/**
 * ISO 20022 Data Mapper — Module Index
 *
 * Provides translation between internal JSON transfer/transaction objects
 * and ISO 20022 MX XML messages for interoperability with FedNow, SWIFT,
 * and international clearinghouses.
 *
 * Supported message types:
 *   - pain.001.001.11 — Customer Credit Transfer Initiation
 *   - pacs.008.001.10 — FI to FI Customer Credit Transfer
 *   - pacs.002.001.12 — Payment Status Report
 *   - camt.053.001.10 — Bank to Customer Statement
 */

export {
  toISO20022Pain001,
  toISO20022Pacs008,
  toISO20022Pacs002,
  toISO20022Camt053,
  fromISO20022Pain001,
  fromISO20022Pacs002,
  isISO20022Message,
  detectMessageType,
} from './mapper.ts';

export type { Pacs002StatusCode } from './mapper.ts';

export {
  validateISO20022Message,
  validateBIC,
  validateIBAN,
  validateCurrencyCode,
  validateISODate,
} from './validator.ts';

export type {
  ValidationResult,
  ValidationError,
} from './validator.ts';

export type {
  ISO20022Amount,
  ISO20022Party,
  ISO20022Account,
  ISO20022Agent,
  Pain001CreditTransfer,
  Pain001Payment,
  Pain001Transfer,
  Pacs008FITransfer,
  Pacs008Transaction,
  Camt053Statement,
  Camt053StatementEntry,
  Camt053Balance,
  Camt053TransactionEntry,
  InternalTransfer,
  InternalTransaction,
  InternalStatement,
} from './types.ts';
