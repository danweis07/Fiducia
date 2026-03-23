import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { VaultDocumentCategory } from "@/types";

export function useVaultDocuments(
  params: { limit?: number; offset?: number; category?: VaultDocumentCategory } = {},
) {
  return useQuery({
    queryKey: ["vault", "documents", params],
    queryFn: () => gateway.vault.list(params),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      category: VaultDocumentCategory;
      description?: string;
      tags?: string[];
      mimeType?: string;
      fileSizeBytes?: number;
    }) => gateway.vault.upload(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault"] });
    },
  });
}

export function useVaultDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ["vault", "document", documentId],
    queryFn: () => gateway.vault.get(documentId!),
    enabled: !!documentId,
  });
}

export function useUpdateVaultDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      documentId: string;
      name?: string;
      category?: VaultDocumentCategory;
      description?: string;
      tags?: string[];
    }) => gateway.vault.update(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault"] });
    },
  });
}

export function useDeleteVaultDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => gateway.vault.delete(documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault"] });
    },
  });
}

export function useVaultSummary() {
  return useQuery({
    queryKey: ["vault", "summary"],
    queryFn: () => gateway.vault.summary(),
  });
}

export function useSearchVaultDocuments(params: {
  query?: string;
  category?: VaultDocumentCategory;
  tags?: string[];
}) {
  return useQuery({
    queryKey: ["vault", "search", params],
    queryFn: () => gateway.vault.search(params),
    enabled: !!(params.query || params.category || (params.tags && params.tags.length > 0)),
  });
}
