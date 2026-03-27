/**
 * Demo Data — Data Migration Toolkit
 *
 * Mock responses for migration gateway actions. Enables the migration UI
 * to work fully in demo mode without a backend.
 */

import type {
  MigrationBatch,
  MigrationBatchRow,
  MappingTemplate,
  ReconciliationReport,
  ValidationError,
} from "@/types/migration";

import { ActionHandler, TENANT_ID, isoDate, withPagination } from "./types";

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleBatches: MigrationBatch[] = [
  {
    id: "batch-001",
    firmId: TENANT_ID,
    label: "Initial Member Load — Symitar Export",
    sourceSystem: "Symitar",
    status: "completed",
    entityType: "members",
    fileName: "symitar_members_20260320.csv",
    fileFormat: "csv",
    totalRows: 12450,
    validRows: 12438,
    errorRows: 12,
    dryRun: false,
    mappingTemplateId: "tmpl-001",
    importedBy: "user-admin-001",
    startedAt: isoDate(5),
    completedAt: isoDate(5),
    rolledBackAt: null,
    errorSummary: { duplicate_email: 7, invalid_phone: 3, missing_ssn: 2 },
    reconciliation: {
      sourceTotalCents: 0,
      targetTotalCents: 0,
      sourceRowCount: 12450,
      targetRowCount: 12438,
      balanceMatch: true,
      countMatch: false,
    },
    createdAt: isoDate(6),
  },
  {
    id: "batch-002",
    firmId: TENANT_ID,
    label: "Account Balances — Symitar Export",
    sourceSystem: "Symitar",
    status: "validated",
    entityType: "accounts",
    fileName: "symitar_accounts_20260321.csv",
    fileFormat: "csv",
    totalRows: 24800,
    validRows: 24800,
    errorRows: 0,
    dryRun: true,
    mappingTemplateId: "tmpl-002",
    importedBy: null,
    startedAt: isoDate(3),
    completedAt: null,
    rolledBackAt: null,
    errorSummary: {},
    reconciliation: {
      sourceTotalCents: 4587632100,
      targetTotalCents: 4587632100,
      sourceRowCount: 24800,
      targetRowCount: 24800,
      balanceMatch: true,
      countMatch: true,
    },
    createdAt: isoDate(4),
  },
  {
    id: "batch-003",
    firmId: TENANT_ID,
    label: "Bill Pay Payees — Symitar Export",
    sourceSystem: "Symitar",
    status: "failed",
    entityType: "payees",
    fileName: "symitar_payees_20260322.csv",
    fileFormat: "csv",
    totalRows: 8900,
    validRows: 7200,
    errorRows: 1700,
    dryRun: false,
    mappingTemplateId: null,
    importedBy: "user-admin-001",
    startedAt: isoDate(1),
    completedAt: null,
    rolledBackAt: null,
    errorSummary: { invalid_account_ref: 1200, missing_payee_name: 500 },
    reconciliation: {
      sourceTotalCents: 0,
      targetTotalCents: 0,
      sourceRowCount: 8900,
      targetRowCount: 7200,
      balanceMatch: false,
      countMatch: false,
    },
    createdAt: isoDate(2),
  },
];

const sampleRows: MigrationBatchRow[] = [
  {
    id: "row-001",
    batchId: "batch-001",
    rowNumber: 1,
    status: "imported",
    sourceData: {
      MemberID: "M10001",
      FirstName: "Alice",
      LastName: "Johnson",
      Email: "alice.johnson@email.com",
      Phone: "555-0101",
    },
    mappedData: {
      member_number: "M10001",
      first_name: "Alice",
      last_name: "Johnson",
      email: "alice.johnson@email.com",
      phone: "+15550101",
    },
    targetTable: "firm_users",
    targetId: "uuid-alice-001",
    errors: [],
    createdAt: isoDate(5),
  },
  {
    id: "row-002",
    batchId: "batch-001",
    rowNumber: 2,
    status: "imported",
    sourceData: {
      MemberID: "M10002",
      FirstName: "Robert",
      LastName: "Martinez",
      Email: "rmartinez@email.com",
      Phone: "555-0102",
    },
    mappedData: {
      member_number: "M10002",
      first_name: "Robert",
      last_name: "Martinez",
      email: "rmartinez@email.com",
      phone: "+15550102",
    },
    targetTable: "firm_users",
    targetId: "uuid-robert-002",
    errors: [],
    createdAt: isoDate(5),
  },
  {
    id: "row-003",
    batchId: "batch-001",
    rowNumber: 87,
    status: "imported",
    sourceData: {
      MemberID: "M10087",
      FirstName: "Patricia",
      LastName: "Chen",
      Email: "pchen@email.com",
      Phone: "555-0187",
    },
    mappedData: {
      member_number: "M10087",
      first_name: "Patricia",
      last_name: "Chen",
      email: "pchen@email.com",
      phone: "+15550187",
    },
    targetTable: "firm_users",
    targetId: "uuid-patricia-087",
    errors: [],
    createdAt: isoDate(5),
  },
  {
    id: "row-004",
    batchId: "batch-001",
    rowNumber: 143,
    status: "invalid",
    sourceData: {
      MemberID: "M10143",
      FirstName: "Carol",
      LastName: "Davis",
      Email: "carol@dupe.com",
      Phone: "",
    },
    mappedData: {},
    targetTable: null,
    targetId: null,
    errors: [
      {
        field: "Email",
        code: "duplicate",
        message: "Email carol@dupe.com already exists in this batch",
      },
      { field: "Phone", code: "required", message: "Phone number is required" },
    ] satisfies ValidationError[],
    createdAt: isoDate(5),
  },
  {
    id: "row-005",
    batchId: "batch-001",
    rowNumber: 256,
    status: "invalid",
    sourceData: {
      MemberID: "M10256",
      FirstName: "James",
      LastName: "Okonkwo",
      Email: "jokonkwo@email.com",
      Phone: "555-invalid",
    },
    mappedData: {},
    targetTable: null,
    targetId: null,
    errors: [
      {
        field: "Phone",
        code: "invalid_phone",
        message: "Phone number '555-invalid' does not match expected format",
      },
    ] satisfies ValidationError[],
    createdAt: isoDate(5),
  },
];

const sampleTemplates: MappingTemplate[] = [
  {
    id: "tmpl-001",
    firmId: TENANT_ID,
    name: "Symitar Member Export → Fiducia Members",
    sourceSystem: "Symitar",
    entityType: "members",
    fieldMappings: [
      {
        sourceField: "MemberID",
        targetField: "member_number",
        transform: "none",
        defaultValue: null,
        required: false,
      },
      {
        sourceField: "FirstName",
        targetField: "first_name",
        transform: "trim",
        defaultValue: null,
        required: true,
      },
      {
        sourceField: "LastName",
        targetField: "last_name",
        transform: "trim",
        defaultValue: null,
        required: true,
      },
      {
        sourceField: "Email",
        targetField: "email",
        transform: "lowercase",
        defaultValue: null,
        required: true,
      },
      {
        sourceField: "Phone",
        targetField: "phone",
        transform: "phone_e164",
        defaultValue: null,
        required: false,
      },
      {
        sourceField: "SSN",
        targetField: "ssn_masked",
        transform: "ssn_mask",
        defaultValue: null,
        required: false,
      },
      {
        sourceField: "DOB",
        targetField: "date_of_birth",
        transform: "date_iso",
        defaultValue: null,
        required: false,
      },
    ],
    isShared: true,
    createdBy: "user-admin-001",
    createdAt: isoDate(10),
    updatedAt: isoDate(10),
  },
  {
    id: "tmpl-002",
    firmId: TENANT_ID,
    name: "Symitar Accounts → Fiducia Accounts",
    sourceSystem: "Symitar",
    entityType: "accounts",
    fieldMappings: [
      {
        sourceField: "AccountNumber",
        targetField: "account_number",
        transform: "none",
        defaultValue: null,
        required: true,
      },
      {
        sourceField: "MemberID",
        targetField: "member_reference",
        transform: "none",
        defaultValue: null,
        required: true,
      },
      {
        sourceField: "AccountType",
        targetField: "account_type",
        transform: "lowercase",
        defaultValue: null,
        required: true,
      },
      {
        sourceField: "Balance",
        targetField: "balance_cents",
        transform: "dollars_to_cents",
        defaultValue: null,
        required: true,
      },
      {
        sourceField: "OpenDate",
        targetField: "opened_at",
        transform: "date_iso",
        defaultValue: null,
        required: false,
      },
    ],
    isShared: true,
    createdBy: "user-admin-001",
    createdAt: isoDate(10),
    updatedAt: isoDate(8),
  },
];

const sampleReconciliation: ReconciliationReport = {
  id: "recon-001",
  batchId: "batch-002",
  reportType: "pre_import",
  sourceTotalCents: 4587632100,
  targetTotalCents: 4587632100,
  sourceRowCount: 24800,
  targetRowCount: 24800,
  discrepancies: [],
  passed: true,
  generatedAt: isoDate(3),
};

const sampleDryRunPreview = {
  batchId: "batch-002",
  entityType: "accounts",
  totalRows: 24800,
  validRows: 24800,
  errorRows: 0,
  warningRows: 45,
  sampleCreates: [
    {
      account_number: "****1234",
      account_type: "checking",
      balance_cents: 152300,
      member_reference: "M10001",
    },
    {
      account_number: "****5678",
      account_type: "savings",
      balance_cents: 875000,
      member_reference: "M10001",
    },
    {
      account_number: "****9012",
      account_type: "checking",
      balance_cents: 43200,
      member_reference: "M10002",
    },
  ],
  sampleErrors: [],
  reconciliation: {
    sourceTotalCents: 4587632100,
    targetTotalCents: 4587632100,
    sourceRowCount: 24800,
    targetRowCount: 24800,
    balanceMatch: true,
    countMatch: true,
  },
};

// =============================================================================
// HANDLERS
// =============================================================================

export const migrationHandlers: Record<string, ActionHandler> = {
  "migration.batches.list": () => withPagination({ batches: sampleBatches }, sampleBatches.length),

  "migration.batches.get": (params) => {
    const batch = sampleBatches.find((b) => b.id === params.batchId);
    return {
      batch: batch ? { ...batch, rows: sampleRows.filter((r) => r.batchId === batch.id) } : null,
    };
  },

  "migration.upload": () => ({
    batch: {
      ...sampleBatches[2],
      id: "batch-new-" + Date.now(),
      status: "draft",
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      errorSummary: {},
    },
  }),

  "migration.validate": (params) => {
    const batch = sampleBatches.find((b) => b.id === params.batchId);
    if (!batch) return { error: "Batch not found" };
    return {
      batch: { ...batch, status: "validated", validRows: batch.totalRows - 12, errorRows: 12 },
      errors: sampleRows.filter((r) => r.status === "invalid"),
    };
  },

  "migration.preview": (params) => {
    const batch = sampleBatches.find((b) => b.id === params.batchId);
    if (!batch) return { error: "Batch not found" };
    return { preview: sampleDryRunPreview };
  },

  "migration.execute": (params) => {
    const batch = sampleBatches.find((b) => b.id === params.batchId);
    if (!batch) return { error: "Batch not found" };
    return {
      batch: {
        ...batch,
        status: "completed",
        dryRun: false,
        completedAt: new Date().toISOString(),
      },
    };
  },

  "migration.rollback": (params) => {
    const batch = sampleBatches.find((b) => b.id === params.batchId);
    if (!batch) return { error: "Batch not found" };
    return {
      batch: { ...batch, status: "rolled_back", rolledBackAt: new Date().toISOString() },
    };
  },

  "migration.reconcile": (params) => {
    const batchId = params.batchId as string;
    return { report: { ...sampleReconciliation, batchId } };
  },

  "migration.mappings.list": () =>
    withPagination({ templates: sampleTemplates }, sampleTemplates.length),

  "migration.mappings.save": (params) => ({
    template: {
      ...sampleTemplates[0],
      id: "tmpl-new-" + Date.now(),
      name: (params.name as string) ?? "New Template",
      updatedAt: new Date().toISOString(),
    },
  }),

  "migration.mappings.delete": () => ({ success: true }),
};
