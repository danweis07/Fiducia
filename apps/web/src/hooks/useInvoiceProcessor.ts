import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { InvoiceStatus } from "@/types";

export function useInvoices(status?: InvoiceStatus) {
  return useQuery({
    queryKey: ["invoices", status],
    queryFn: () => gateway.invoiceProcessor.list({ status }),
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ["invoices", invoiceId],
    queryFn: () => gateway.invoiceProcessor.get(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useAnalyzeInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { fileBase64: string; fileName: string; mimeType: string }) =>
      gateway.invoiceProcessor.analyze(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useConfirmInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { invoiceId: string; accountId: string; scheduledDate: string }) =>
      gateway.invoiceProcessor.confirm(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => gateway.invoiceProcessor.cancel(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
