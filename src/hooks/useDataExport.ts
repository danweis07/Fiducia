import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { ExportFormat, ReportType } from '@/types/admin';

export function useExportList(params?: { status?: string; reportType?: string }) {
  return useQuery({
    queryKey: ['exports', params],
    queryFn: () => gateway.exports.list(params),
  });
}

export function useExportSummary() {
  return useQuery({
    queryKey: ['exports', 'summary'],
    queryFn: () => gateway.exports.summary(),
  });
}

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      reportType: ReportType;
      format: ExportFormat;
      dateRangeStart: string;
      dateRangeEnd: string;
      filters?: Record<string, unknown>;
    }) => gateway.exports.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exports'] });
    },
  });
}

export function useDownloadExport() {
  return useMutation({
    mutationFn: (exportId: string) => gateway.exports.download(exportId),
  });
}

export function useDeleteExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exportId: string) => gateway.exports.delete(exportId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exports'] });
    },
  });
}

export function useReportTemplates() {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: () => gateway.reportTemplates.list(),
  });
}

export function useCreateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      reportType: string;
      defaultFormat: string;
      defaultFilters?: Record<string, unknown>;
      schedule?: Record<string, unknown>;
    }) => gateway.reportTemplates.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
}

export function useDeleteReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => gateway.reportTemplates.delete(templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
}
