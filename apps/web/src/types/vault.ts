/**
 * Document Vault Types
 *
 * Secure document storage entities.
 */

// =============================================================================
// DOCUMENT VAULT
// =============================================================================

export type VaultDocumentCategory =
  | "tax_form"
  | "statement"
  | "receipt"
  | "insurance"
  | "legal"
  | "identification"
  | "other";

export interface VaultDocument {
  id: string;
  name: string;
  category: VaultDocumentCategory;
  description: string | null;
  tags: string[];
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface VaultSummary {
  totalDocuments: number;
  totalSizeBytes: number;
  byCategory: Record<VaultDocumentCategory, number>;
}
