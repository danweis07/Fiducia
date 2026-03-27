/**
 * Data Migration Types
 *
 * Types for the bulk data import pipeline: batches, row-level validation,
 * schema mapping templates, and reconciliation reports.
 */

// =============================================================================
// ENTITY TYPES
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

export type MigrationFileFormat = "csv" | "json";

// =============================================================================
// FIELD MAPPING
// =============================================================================

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
  defaultValue?: string;
}

export type FieldTransform =
  | "none"
  | "uppercase"
  | "lowercase"
  | "trim"
  | "date_iso"
  | "date_us"
  | "cents_to_dollars"
  | "dollars_to_cents"
  | "boolean_yn"
  | "phone_normalize"
  | "ssn_mask";

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
// MIGRATION BATCH
// =============================================================================

export interface MigrationBatch {
  id: string;
  firmId: string;
  label: string;
  sourceSystem: string;
  status: MigrationBatchStatus;
  entityType: MigrationEntityType;
  fileName: string | null;
  fileFormat: MigrationFileFormat | null;
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
  reconciliation: BatchReconciliation;
  createdAt: string;
}

export interface BatchReconciliation {
  sourceTotalCents?: number;
  targetTotalCents?: number;
  sourceRowCount?: number;
  targetRowCount?: number;
  balanceMatch?: boolean;
  countMatch?: boolean;
}

// =============================================================================
// BATCH ROW
// =============================================================================

export interface ValidationError {
  field: string;
  code: string;
  message: string;
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
// RECONCILIATION REPORT
// =============================================================================

export interface ReconciliationDiscrepancy {
  field: string;
  sourceValue: string;
  targetValue: string;
  description: string;
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

// =============================================================================
// DRY RUN PREVIEW
// =============================================================================

export interface DryRunPreview {
  batchId: string;
  entityType: MigrationEntityType;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  sampleCreates: Record<string, unknown>[];
  sampleErrors: MigrationBatchRow[];
  reconciliation: BatchReconciliation;
}

// =============================================================================
// UPLOAD PARAMS
// =============================================================================

export interface MigrationUploadParams {
  label: string;
  sourceSystem: string;
  entityType: MigrationEntityType;
  fileFormat: MigrationFileFormat;
  fileName: string;
  data: Record<string, unknown>[];
  mappingTemplateId?: string;
}
