/**
 * Data Migration Hooks
 *
 * TanStack React Query hooks for the data migration toolkit.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type {
  MigrationBatch,
  MigrationBatchRow,
  MappingTemplate,
  ReconciliationReport,
  DryRunPreview,
  MigrationUploadParams,
  FieldMapping,
  MigrationEntityType,
} from "@/types/migration";

// ---------------------------------------------------------------------------
// BATCH QUERIES
// ---------------------------------------------------------------------------

export function useMigrationBatches(page = 1) {
  return useQuery({
    queryKey: ["migration-batches", page],
    queryFn: () =>
      gateway.request<{
        data: MigrationBatch[];
        _pagination: { page: number; perPage: number; total: number; totalPages: number };
      }>("migration.batches.list", { page }),
  });
}

export function useMigrationBatch(batchId: string) {
  return useQuery({
    queryKey: ["migration-batch", batchId],
    queryFn: () => gateway.request<{ batch: MigrationBatch }>("migration.batches.get", { batchId }),
    enabled: !!batchId,
  });
}

export function useMigrationRows(batchId: string, page = 1) {
  return useQuery({
    queryKey: ["migration-rows", batchId, page],
    queryFn: () =>
      gateway.request<{
        data: MigrationBatchRow[];
        _pagination: { page: number; perPage: number; total: number; totalPages: number };
      }>("migration.rows.list", { batchId, page }),
    enabled: !!batchId,
  });
}

// ---------------------------------------------------------------------------
// BATCH MUTATIONS
// ---------------------------------------------------------------------------

export function useUploadMigration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: MigrationUploadParams) =>
      gateway.request<{ batch: MigrationBatch }>("migration.upload", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["migration-batches"] }),
  });
}

export function useValidateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      gateway.request<{ batch: MigrationBatch; errors: MigrationBatchRow[] }>(
        "migration.validate",
        { batchId },
      ),
    onSuccess: (_data, batchId) => {
      qc.invalidateQueries({ queryKey: ["migration-batch", batchId] });
      qc.invalidateQueries({ queryKey: ["migration-batches"] });
    },
  });
}

export function useMigrationPreview(batchId: string) {
  return useQuery({
    queryKey: ["migration-preview", batchId],
    queryFn: () => gateway.request<{ preview: DryRunPreview }>("migration.preview", { batchId }),
    enabled: !!batchId,
  });
}

export function useExecuteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      gateway.request<{ batch: MigrationBatch }>("migration.execute", { batchId }),
    onSuccess: (_data, batchId) => {
      qc.invalidateQueries({ queryKey: ["migration-batch", batchId] });
      qc.invalidateQueries({ queryKey: ["migration-batches"] });
    },
  });
}

export function useRollbackBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      gateway.request<{ batch: MigrationBatch }>("migration.rollback", { batchId }),
    onSuccess: (_data, batchId) => {
      qc.invalidateQueries({ queryKey: ["migration-batch", batchId] });
      qc.invalidateQueries({ queryKey: ["migration-batches"] });
    },
  });
}

// ---------------------------------------------------------------------------
// RECONCILIATION
// ---------------------------------------------------------------------------

export function useReconciliationReport(batchId: string) {
  return useQuery({
    queryKey: ["migration-reconciliation", batchId],
    queryFn: () =>
      gateway.request<{ report: ReconciliationReport }>("migration.reconcile", { batchId }),
    enabled: !!batchId,
  });
}

// ---------------------------------------------------------------------------
// MAPPING TEMPLATES
// ---------------------------------------------------------------------------

export function useMappingTemplates() {
  return useQuery({
    queryKey: ["migration-mapping-templates"],
    queryFn: () =>
      gateway.request<{
        data: MappingTemplate[];
        _pagination: { page: number; perPage: number; total: number; totalPages: number };
      }>("migration.mappings.list", {}),
  });
}

export function useSaveMappingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      sourceSystem: string;
      entityType: MigrationEntityType;
      fieldMappings: FieldMapping[];
    }) => gateway.request<{ template: MappingTemplate }>("migration.mappings.save", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["migration-mapping-templates"] }),
  });
}

export function useDeleteMappingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      gateway.request<{ success: boolean }>("migration.mappings.delete", { templateId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["migration-mapping-templates"] }),
  });
}
