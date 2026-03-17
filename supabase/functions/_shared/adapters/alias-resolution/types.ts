/**
 * Alias Resolution Adapter Interface
 *
 * Defines the port for global alias-based payment resolution and
 * Request-to-Pay (R2P) operations across international directories:
 *   - UK Faster Payments (Confirmation of Payee)
 *   - EU SEPA Proxy Lookup
 *   - Brazil Pix DICT (CPF/CNPJ/phone/email/EVP)
 *   - India UPI (VPA resolution via NPCI)
 *   - Singapore PayNow (NRIC/UEN/phone)
 *   - Australia NPP PayID
 *
 * Implementations:
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// TYPES
// =============================================================================

export type AliasType = 'phone' | 'email' | 'tax_id' | 'upi_vpa' | 'pix_key' | 'proxy_id';

export type AliasDirectoryRegion = 'us' | 'uk' | 'eu' | 'br' | 'in' | 'sg' | 'au' | 'mx';

export type RequestToPayStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'cancelled';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface AliasResolution {
  aliasId: string;
  aliasType: AliasType;
  aliasValue: string;
  resolvedName: string;
  resolvedInstitution: string;
  resolvedAccountMasked: string;
  resolvedIban?: string;
  resolvedSortCode?: string;
  resolvedRoutingNumber?: string;
  country: string;
  currency: string;
  availableRails: string[];
  directory: string;
  resolvedAt: string;
  expiresAt: string;
}

export interface RequestToPayInbound {
  requestId: string;
  requesterName: string;
  requesterAlias: string;
  requesterAliasType: AliasType;
  requesterInstitution: string;
  amountCents: number;
  currency: string;
  description: string;
  reference: string;
  status: RequestToPayStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
}

export interface RequestToPayOutbound {
  requestId: string;
  payerName: string;
  payerAlias: string;
  payerAliasType: AliasType;
  amountCents: number;
  currency: string;
  description: string;
  reference: string;
  status: RequestToPayStatus;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ResolveAliasRequest {
  tenantId: string;
  aliasType: AliasType;
  aliasValue: string;
  region?: AliasDirectoryRegion;
}

export interface ResolveAliasResponse {
  resolution: AliasResolution;
}

export interface PayByAliasRequest {
  tenantId: string;
  sourceAccountId: string;
  aliasType: AliasType;
  aliasValue: string;
  amountCents: number;
  currency: string;
  description: string;
  idempotencyKey: string;
}

export interface PayByAliasResponse {
  paymentId: string;
  status: string;
  resolvedName: string;
  resolvedInstitution: string;
  rail: string;
  estimatedArrival: string;
}

export interface ListInboundR2PRequest {
  tenantId: string;
  status?: RequestToPayStatus;
  limit?: number;
  cursor?: string;
}

export interface ListInboundR2PResponse {
  requests: RequestToPayInbound[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface RespondToR2PRequest {
  tenantId: string;
  requestId: string;
  action: 'approve' | 'decline';
  sourceAccountId?: string;
}

export interface RespondToR2PResponse {
  requestId: string;
  status: RequestToPayStatus;
  paymentId: string | null;
}

export interface SendR2PRequest {
  tenantId: string;
  sourceAccountId: string;
  payerAlias: string;
  payerAliasType: AliasType;
  amountCents: number;
  currency: string;
  description: string;
  expiresAt: string;
}

export interface SendR2PResponse {
  request: RequestToPayOutbound;
}

export interface ListOutboundR2PRequest {
  tenantId: string;
  status?: RequestToPayStatus;
  limit?: number;
  cursor?: string;
}

export interface ListOutboundR2PResponse {
  requests: RequestToPayOutbound[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GetSupportedDirectoriesRequest {
  tenantId: string;
}

export interface SupportedDirectory {
  region: AliasDirectoryRegion;
  name: string;
  supportedAliasTypes: AliasType[];
  supportedCurrencies: string[];
  supportsR2P: boolean;
}

export interface GetSupportedDirectoriesResponse {
  directories: SupportedDirectory[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface AliasResolutionAdapter extends BaseAdapter {
  /** Resolve an alias (phone, email, tax ID, VPA) to account details */
  resolveAlias(request: ResolveAliasRequest): Promise<ResolveAliasResponse>;

  /** Pay by alias — resolve + send in one step */
  payByAlias(request: PayByAliasRequest): Promise<PayByAliasResponse>;

  /** List inbound Request-to-Pay requests (from merchants/payees) */
  listInboundR2P(request: ListInboundR2PRequest): Promise<ListInboundR2PResponse>;

  /** Approve or decline an inbound R2P */
  respondToR2P(request: RespondToR2PRequest): Promise<RespondToR2PResponse>;

  /** Send an outbound R2P (request money) */
  sendR2P(request: SendR2PRequest): Promise<SendR2PResponse>;

  /** List outbound R2P requests */
  listOutboundR2P(request: ListOutboundR2PRequest): Promise<ListOutboundR2PResponse>;

  /** Get supported alias directories per region */
  getSupportedDirectories(request: GetSupportedDirectoriesRequest): Promise<GetSupportedDirectoriesResponse>;
}
