/**
 * Digital Activation Hooks
 *
 * React Query hooks for the digital activation flow —
 * existing members activating online banking access.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type {
  IdentityVerificationRequest,
  CredentialCreateRequest,
  MFAEnrollRequest,
  MFAVerifyRequest,
  DeviceRegisterRequest,
  PasskeyRegistrationResponse,
} from "@/types/activation";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const activationKeys = {
  all: ["activation"] as const,
  config: () => ["activation", "config"] as const,
  termsStatus: () => ["activation", "terms-status"] as const,
  terms: (type?: string) => ["activation", "terms", type] as const,
  termsAcceptances: (documentId?: string) =>
    ["activation", "terms-acceptances", documentId] as const,
};

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Fetch tenant-specific activation config (fields, rules, MFA policies, terms) */
export function useActivationConfig() {
  return useQuery({
    queryKey: activationKeys.config(),
    queryFn: () => gateway.activation.config(),
    staleTime: 1000 * 60 * 10, // Config rarely changes — cache 10 min
  });
}

// =============================================================================
// IDENTITY VERIFICATION
// =============================================================================

/** Verify member identity against core banking records */
export function useVerifyIdentity() {
  return useMutation({
    mutationFn: (params: IdentityVerificationRequest) => gateway.activation.verifyIdentity(params),
  });
}

// =============================================================================
// TERMS ACCEPTANCE
// =============================================================================

/** Accept terms/disclosures during activation */
export function useAcceptTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      activationToken: string;
      acceptances: Array<{ documentId: string; version: string }>;
    }) => gateway.activation.acceptTerms(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activationKeys.termsStatus() });
    },
  });
}

/** Check if authenticated member needs to accept new/updated terms */
export function useTermsStatus() {
  return useQuery({
    queryKey: activationKeys.termsStatus(),
    queryFn: () => gateway.activation.checkTermsStatus(),
  });
}

/** Fetch active terms documents */
export function useTermsDocuments(type?: string) {
  return useQuery({
    queryKey: activationKeys.terms(type),
    queryFn: () => gateway.activation.getTerms({ type }),
  });
}

// =============================================================================
// CREDENTIALS
// =============================================================================

/** Create login credentials (username + password) */
export function useCreateCredentials() {
  return useMutation({
    mutationFn: (params: CredentialCreateRequest) => gateway.activation.createCredentials(params),
  });
}

// =============================================================================
// MFA ENROLLMENT
// =============================================================================

/** Initiate MFA enrollment with chosen method */
export function useEnrollMFA() {
  return useMutation({
    mutationFn: (params: MFAEnrollRequest) => gateway.activation.enrollMFA(params),
  });
}

/** Verify MFA code during enrollment */
export function useVerifyMFA() {
  return useMutation({
    mutationFn: (params: MFAVerifyRequest) => gateway.activation.verifyMFA(params),
  });
}

// =============================================================================
// PASSKEY / BIOMETRIC
// =============================================================================

/** Get WebAuthn registration options (challenge) from server */
export function usePasskeyOptions() {
  return useMutation({
    mutationFn: (activationToken: string) => gateway.activation.passkeyOptions(activationToken),
  });
}

/** Register a passkey after navigator.credentials.create() */
export function useRegisterPasskey() {
  return useMutation({
    mutationFn: (params: PasskeyRegistrationResponse) => gateway.activation.registerPasskey(params),
  });
}

// =============================================================================
// DEVICE REGISTRATION
// =============================================================================

/** Register the member's device as trusted */
export function useRegisterDevice() {
  return useMutation({
    mutationFn: (params: DeviceRegisterRequest) => gateway.activation.registerDevice(params),
  });
}

// =============================================================================
// COMPLETE ACTIVATION
// =============================================================================

/** Finalize the activation flow */
export function useCompleteActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activationToken: string) => gateway.activation.complete(activationToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activationKeys.all });
    },
  });
}

// =============================================================================
// ADMIN: TERMS MANAGEMENT
// =============================================================================

/** Admin: create a new version of a terms document */
export function useCreateTermsVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      type: string;
      title: string;
      content: string;
      version: string;
      mandatory: boolean;
    }) => gateway.activation.createTermsVersion(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activationKeys.terms() });
    },
  });
}

/** Admin: get terms acceptance records */
export function useTermsAcceptances(documentId?: string) {
  return useQuery({
    queryKey: activationKeys.termsAcceptances(documentId),
    queryFn: () =>
      gateway.activation.getTermsAcceptances({
        documentId,
        currentOnly: true,
      }),
  });
}
