/**
 * Data Migration Toolkit Types
 *
 * Types for bulk data import, schema mapping, validation, and reconciliation.
 * Supports credit unions and community banks migrating from legacy core systems.
 */

// =============================================================================
// MIGRATION BATCHES
// =============================================================================

export type MigrationEntityType =
  | "members"
  | "accounts"
  | "transactions"
  | "payees"
  | "cards"
  | "loans";

export type MigrationBatchStatus =
  | "draft"
  | "validating"
  | "validated"
  | "importing"
  | "completed"
  | "failed"
  | "rolled_back";

export type MigrationRowStatus = "pending" | "valid" | "invalid" | "imported" | "rolled_back";

export type ReconciliationReportType = "pre_import" | "post_import" | "balance_check";

export interface MigrationBatch {
  id: string;
  firmId: string;
  label: string;
  sourceSystem: string;
  status: MigrationBatchStatus;
  entityType: MigrationEntityType;
  fileName: string;
  fileFormat: "csv" | "json";
  totalRows: number;
  validRows: number;
  errorRows: number;
  dryRun: boolean;
  mappingTemplateId: string | null;
  importedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rolledBackAt: string | null;
  errorSummary: Record<string, number>;
  reconciliation: ReconciliationSummary;
  createdAt: string;
}

export interface MigrationBatchRow {
  id: string;
  batchId: string;
  rowNumber: number;
  status: MigrationRowStatus;
  sourceData: Record<string, unknown>;
  mappedData: Record<string, unknown>;
  targetTable: string | null;
  targetId: string | null;
  errors: ValidationError[];
  createdAt: string;
}

// =============================================================================
// SCHEMA MAPPING
// =============================================================================

export type FieldTransform =
  | "none"
  | "uppercase"
  | "lowercase"
  | "trim"
  | "date_iso"
  | "date_us"
  | "cents_to_dollars"
  | "dollars_to_cents"
  | "phone_e164"
  | "ssn_mask"
  | "boolean_yn"
  | "strip_non_numeric";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform: FieldTransform;
  defaultValue: string | null;
  required: boolean;
}

export interface MappingTemplate {
  id: string;
  firmId: string;
  name: string;
  sourceSystem: string;
  entityType: MigrationEntityType;
  fieldMappings: FieldMapping[];
  isShared: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

export type ValidationErrorCode =
  | "required"
  | "invalid_type"
  | "invalid_format"
  | "invalid_length"
  | "duplicate"
  | "reference_not_found"
  | "out_of_range"
  | "invalid_enum"
  | "invalid_email"
  | "invalid_phone"
  | "invalid_date"
  | "invalid_routing_number"
  | "balance_mismatch";

export interface ValidationError {
  field: string;
  code: ValidationErrorCode;
  message: string;
  rowNumber?: number;
  value?: unknown;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  errorsByCode: Record<ValidationErrorCode, number>;
  errorsByField: Record<string, number>;
}

// =============================================================================
// RECONCILIATION
// =============================================================================

export interface ReconciliationSummary {
  sourceTotalCents: number;
  targetTotalCents: number;
  sourceRowCount: number;
  targetRowCount: number;
  balanceMatch: boolean;
  countMatch: boolean;
}

export interface ReconciliationReport {
  id: string;
  batchId: string;
  reportType: ReconciliationReportType;
  sourceTotalCents: number;
  targetTotalCents: number;
  sourceRowCount: number;
  targetRowCount: number;
  discrepancies: ReconciliationDiscrepancy[];
  passed: boolean;
  generatedAt: string;
}

export interface ReconciliationDiscrepancy {
  field: string;
  sourceValue: string;
  targetValue: string;
  difference: string;
  severity: "error" | "warning" | "info";
}

// =============================================================================
// IMPORT PREVIEW (DRY RUN)
// =============================================================================

export interface ImportPreview {
  batch: MigrationBatch;
  validation: ValidationSummary;
  reconciliation: ReconciliationSummary;
  sampleRows: ImportPreviewRow[];
  estimatedDuration: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  action: "create" | "update" | "skip";
  targetTable: string;
  fields: Record<string, { source: unknown; mapped: unknown }>;
  errors: ValidationError[];
}

// =============================================================================
// SOURCE SYSTEM PRESETS
// =============================================================================

export interface SourceSystemPreset {
  id: string;
  name: string;
  vendor: string;
  description: string;
  supportedEntities: MigrationEntityType[];
  sampleHeaders: Record<MigrationEntityType, string[]>;
}

export const SOURCE_SYSTEMS: SourceSystemPreset[] = [
  {
    id: "symitar",
    name: "Symitar (Jack Henry)",
    vendor: "Jack Henry & Associates",
    description: "SymXchange / Episys core banking export",
    supportedEntities: ["members", "accounts", "transactions", "loans", "cards"],
    sampleHeaders: {
      members: [
        "MEMBER_NUMBER",
        "FIRST_NAME",
        "LAST_NAME",
        "SSN",
        "DOB",
        "EMAIL",
        "PHONE",
        "ADDRESS_LINE1",
        "CITY",
        "STATE",
        "ZIP",
      ],
      accounts: [
        "ACCOUNT_NUMBER",
        "MEMBER_NUMBER",
        "ACCOUNT_TYPE",
        "BALANCE",
        "AVAILABLE_BALANCE",
        "OPEN_DATE",
        "STATUS",
      ],
      transactions: [
        "TRANSACTION_ID",
        "ACCOUNT_NUMBER",
        "AMOUNT",
        "TRANSACTION_DATE",
        "DESCRIPTION",
        "TYPE_CODE",
      ],
      payees: ["PAYEE_ID", "MEMBER_NUMBER", "PAYEE_NAME", "ACCOUNT_NUMBER", "ROUTING_NUMBER"],
      cards: [
        "CARD_NUMBER",
        "MEMBER_NUMBER",
        "ACCOUNT_NUMBER",
        "STATUS",
        "EXPIRATION_DATE",
        "CARD_TYPE",
      ],
      loans: [
        "LOAN_NUMBER",
        "MEMBER_NUMBER",
        "ORIGINAL_AMOUNT",
        "BALANCE",
        "RATE",
        "TERM_MONTHS",
        "OPEN_DATE",
        "STATUS",
      ],
    },
  },
  {
    id: "cuanswers",
    name: "CU*Answers",
    vendor: "CU*Answers",
    description: "CU*BASE core banking export",
    supportedEntities: ["members", "accounts", "transactions", "loans"],
    sampleHeaders: {
      members: [
        "MBR_NUM",
        "FNAME",
        "LNAME",
        "TAX_ID",
        "BIRTH_DT",
        "EMAIL_ADDR",
        "PHONE_NUM",
        "ADDR1",
        "CITY",
        "STATE",
        "ZIP_CODE",
      ],
      accounts: [
        "ACCT_NUM",
        "MBR_NUM",
        "ACCT_TYPE_CD",
        "CUR_BAL",
        "AVAIL_BAL",
        "OPEN_DT",
        "STAT_CD",
      ],
      transactions: ["TXN_SEQ", "ACCT_NUM", "AMT", "TXN_DT", "DESC", "TXN_TYPE"],
      payees: [],
      cards: [],
      loans: [
        "LOAN_NUM",
        "MBR_NUM",
        "ORIG_AMT",
        "CUR_BAL",
        "INT_RATE",
        "TERM",
        "OPEN_DT",
        "STAT_CD",
      ],
    },
  },
  {
    id: "fiserv-dna",
    name: "Fiserv DNA",
    vendor: "Fiserv",
    description: "DNA core banking platform export",
    supportedEntities: ["members", "accounts", "transactions", "payees", "cards", "loans"],
    sampleHeaders: {
      members: [
        "CustomerNumber",
        "FirstName",
        "LastName",
        "TaxId",
        "DateOfBirth",
        "Email",
        "PhoneNumber",
        "AddressLine1",
        "City",
        "State",
        "PostalCode",
      ],
      accounts: [
        "AccountNumber",
        "CustomerNumber",
        "ProductType",
        "CurrentBalance",
        "AvailableBalance",
        "OpenDate",
        "AccountStatus",
      ],
      transactions: [
        "TransactionId",
        "AccountNumber",
        "Amount",
        "PostDate",
        "Description",
        "TransactionType",
      ],
      payees: ["PayeeId", "CustomerNumber", "PayeeName", "AccountNumber", "RoutingNumber"],
      cards: [
        "CardNumber",
        "CustomerNumber",
        "AccountNumber",
        "CardStatus",
        "ExpirationDate",
        "CardType",
      ],
      loans: [
        "LoanNumber",
        "CustomerNumber",
        "OriginalAmount",
        "CurrentBalance",
        "InterestRate",
        "Term",
        "OriginationDate",
        "LoanStatus",
      ],
    },
  },
  {
    id: "fis-horizon",
    name: "FIS Horizon",
    vendor: "FIS",
    description: "Horizon / IBS core banking export",
    supportedEntities: ["members", "accounts", "transactions", "loans"],
    sampleHeaders: {
      members: [
        "CIF_NUMBER",
        "FIRST_NM",
        "LAST_NM",
        "SSN_TIN",
        "BIRTH_DATE",
        "EMAIL",
        "PHONE",
        "ADDRESS",
        "CITY",
        "STATE",
        "ZIPCODE",
      ],
      accounts: [
        "ACCT_NBR",
        "CIF_NUMBER",
        "PROD_CODE",
        "LEDGER_BAL",
        "AVAIL_BAL",
        "OPEN_DATE",
        "STATUS_CODE",
      ],
      transactions: ["SEQ_NBR", "ACCT_NBR", "TRAN_AMT", "POST_DATE", "DESCRIPTION", "TRAN_CODE"],
      payees: [],
      cards: [],
      loans: [
        "LOAN_NBR",
        "CIF_NUMBER",
        "ORIG_BAL",
        "CURR_BAL",
        "RATE",
        "TERM_MO",
        "ORIG_DATE",
        "STAT",
      ],
    },
  },
  {
    id: "corelation-keystone",
    name: "Corelation KeyStone",
    vendor: "Corelation",
    description: "KeyStone core banking export",
    supportedEntities: ["members", "accounts", "transactions", "loans"],
    sampleHeaders: {
      members: [
        "PersonId",
        "FirstName",
        "LastName",
        "Ssn",
        "BirthDate",
        "EmailAddress",
        "PhoneNumber",
        "Street",
        "City",
        "State",
        "Zip",
      ],
      accounts: [
        "AccountId",
        "PersonId",
        "AccountType",
        "Balance",
        "Available",
        "DateOpened",
        "Status",
      ],
      transactions: ["TransId", "AccountId", "Amount", "TransDate", "Memo", "TransType"],
      payees: [],
      cards: [],
      loans: [
        "LoanId",
        "PersonId",
        "OrigAmount",
        "Balance",
        "Rate",
        "Term",
        "DateOpened",
        "Status",
      ],
    },
  },
  {
    id: "custom",
    name: "Custom / Other",
    vendor: "Other",
    description: "Custom CSV/JSON format — map fields manually",
    supportedEntities: ["members", "accounts", "transactions", "payees", "cards", "loans"],
    sampleHeaders: {
      members: [],
      accounts: [],
      transactions: [],
      payees: [],
      cards: [],
      loans: [],
    },
  },
];

// =============================================================================
// FIDUCIA TARGET SCHEMA (for mapping UI)
// =============================================================================

export const TARGET_FIELDS: Record<
  MigrationEntityType,
  { field: string; label: string; required: boolean; type: string }[]
> = {
  members: [
    { field: "email", label: "Email Address", required: true, type: "email" },
    { field: "first_name", label: "First Name", required: true, type: "string" },
    { field: "last_name", label: "Last Name", required: true, type: "string" },
    { field: "phone", label: "Phone Number", required: false, type: "phone" },
    { field: "date_of_birth", label: "Date of Birth", required: false, type: "date" },
    { field: "address_line1", label: "Address Line 1", required: false, type: "string" },
    { field: "address_line2", label: "Address Line 2", required: false, type: "string" },
    { field: "city", label: "City", required: false, type: "string" },
    { field: "state", label: "State", required: false, type: "string" },
    { field: "postal_code", label: "Postal Code", required: false, type: "string" },
    { field: "member_number", label: "Member/Customer Number", required: false, type: "string" },
  ],
  accounts: [
    { field: "account_number", label: "Account Number", required: true, type: "string" },
    { field: "member_email", label: "Member Email (reference)", required: true, type: "email" },
    { field: "account_type", label: "Account Type", required: true, type: "enum" },
    { field: "balance_cents", label: "Current Balance (cents)", required: true, type: "integer" },
    {
      field: "available_balance_cents",
      label: "Available Balance (cents)",
      required: false,
      type: "integer",
    },
    { field: "opened_at", label: "Date Opened", required: false, type: "date" },
    { field: "status", label: "Status", required: false, type: "enum" },
    { field: "routing_number", label: "Routing Number", required: false, type: "string" },
    { field: "nickname", label: "Account Nickname", required: false, type: "string" },
  ],
  transactions: [
    {
      field: "account_number",
      label: "Account Number (reference)",
      required: true,
      type: "string",
    },
    { field: "amount_cents", label: "Amount (cents)", required: true, type: "integer" },
    { field: "posted_at", label: "Post Date", required: true, type: "date" },
    { field: "description", label: "Description", required: true, type: "string" },
    { field: "type", label: "Transaction Type", required: false, type: "enum" },
    { field: "category", label: "Category", required: false, type: "string" },
    { field: "reference_number", label: "Reference Number", required: false, type: "string" },
    {
      field: "running_balance_cents",
      label: "Running Balance (cents)",
      required: false,
      type: "integer",
    },
  ],
  payees: [
    { field: "member_email", label: "Member Email (reference)", required: true, type: "email" },
    { field: "payee_name", label: "Payee Name", required: true, type: "string" },
    { field: "account_number", label: "Payee Account Number", required: false, type: "string" },
    { field: "routing_number", label: "Routing Number", required: false, type: "string" },
    { field: "address", label: "Payee Address", required: false, type: "string" },
    { field: "nickname", label: "Nickname", required: false, type: "string" },
  ],
  cards: [
    { field: "member_email", label: "Member Email (reference)", required: true, type: "email" },
    { field: "account_number", label: "Linked Account Number", required: true, type: "string" },
    { field: "card_number_masked", label: "Card Number (masked)", required: true, type: "string" },
    { field: "card_type", label: "Card Type", required: true, type: "enum" },
    { field: "status", label: "Card Status", required: true, type: "enum" },
    { field: "expiration_date", label: "Expiration Date", required: false, type: "string" },
    { field: "name_on_card", label: "Name on Card", required: false, type: "string" },
  ],
  loans: [
    { field: "member_email", label: "Member Email (reference)", required: true, type: "email" },
    { field: "loan_number", label: "Loan Number", required: true, type: "string" },
    {
      field: "original_amount_cents",
      label: "Original Amount (cents)",
      required: true,
      type: "integer",
    },
    { field: "balance_cents", label: "Current Balance (cents)", required: true, type: "integer" },
    { field: "interest_rate", label: "Interest Rate (%)", required: true, type: "number" },
    { field: "term_months", label: "Term (months)", required: false, type: "integer" },
    { field: "originated_at", label: "Origination Date", required: false, type: "date" },
    { field: "maturity_date", label: "Maturity Date", required: false, type: "date" },
    { field: "status", label: "Loan Status", required: false, type: "enum" },
    { field: "loan_type", label: "Loan Type", required: false, type: "string" },
  ],
};
