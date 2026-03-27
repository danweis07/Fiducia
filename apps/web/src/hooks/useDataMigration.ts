import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type {
  MigrationBatch,
  MigrationBatchRow,
  MappingTemplate,
  ReconciliationReport,
  ImportPreview,
  ValidationSummary,
} from "@/types/migration";

export function useMigrationBatches() {
  return useQuery({
    queryKey: ["migration-batches"],
    queryFn: () =>
      gateway.request<{ batches: MigrationBatch[]; _pagination: { total: number } }>(
        "migration.batches.list",
        {},
      ),
  });
}

export function useMigrationBatch(batchId: string) {
  return useQuery({
    queryKey: ["migration-batch", batchId],
    queryFn: () =>
      gateway.request<{ batch: MigrationBatch; rows: MigrationBatchRow[] }>(
        "migration.batches.get",
        { batchId },
      ),
    enabled: !!batchId,
  });
}

export function useUploadMigration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      fileName: string;
      fileFormat: "csv" | "json";
      entityType: string;
      sourceSystem: string;
      label: string;
      fileContent: string;
    }) => gateway.request<{ batch: MigrationBatch }>("migration.upload", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["migration-batches"] }),
  });
}

export function useValidateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { batchId: string; mappingTemplateId?: string }) =>
      gateway.request<{ batch: MigrationBatch; validation: ValidationSummary }>(
        "migration.validate",
        params,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["migration-batches"] });
      qc.invalidateQueries({ queryKey: ["migration-batch", vars.batchId] });
    },
  });
}

export function useMigrationPreview(batchId: string) {
  return useQuery({
    queryKey: ["migration-preview", batchId],
    queryFn: () => gateway.request<ImportPreview>("migration.preview", { batchId }),
    enabled: !!batchId,
  });
}

export function useExecuteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { batchId: string }) =>
      gateway.request<{ batch: MigrationBatch }>("migration.execute", params),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["migration-batches"] });
      qc.invalidateQueries({ queryKey: ["migration-batch", vars.batchId] });
    },
  });
}

export function useRollbackBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { batchId: string }) =>
      gateway.request<{ batch: MigrationBatch }>("migration.rollback", params),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["migration-batches"] });
      qc.invalidateQueries({ queryKey: ["migration-batch", vars.batchId] });
    },
  });
}

export function useReconciliationReport(batchId: string) {
  return useQuery({
    queryKey: ["migration-reconciliation", batchId],
    queryFn: () =>
      gateway.request<{ report: ReconciliationReport }>("migration.reconcile", { batchId }),
    enabled: !!batchId,
  });
}

export function useMappingTemplates() {
  return useQuery({
    queryKey: ["migration-mapping-templates"],
    queryFn: () => gateway.request<{ templates: MappingTemplate[] }>("migration.mappings.list", {}),
  });
}

export function useSaveMappingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      sourceSystem: string;
      entityType: string;
      fieldMappings: unknown[];
    }) => gateway.request<{ template: MappingTemplate }>("migration.mappings.save", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["migration-mapping-templates"] }),
  });
}

export function useDeleteMappingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { templateId: string }) =>
      gateway.request("migration.mappings.delete", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["migration-mapping-templates"] }),
  });
}
