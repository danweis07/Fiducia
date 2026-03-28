/**
 * Demo data for kyc, aml, activation, audit, complianceAudit, and openBanking.
 */

import { ActionHandler, DEMO_USER } from "./types";
import { tenantConfig } from "@/lib/tenant.config";

// =============================================================================
// HANDLERS
// =============================================================================

export const complianceHandlers: Record<string, ActionHandler> = {
  // KYC
  "kyc.evaluate": () => ({
    evaluation: {
      token: "kyc-demo-token-001",
      status: "approved",
      reasons: [],
      ssnMasked: "***-**-6789",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    adapter: "mock",
  }),
  "kyc.status": () => ({
    evaluation: {
      token: "kyc-demo-token-001",
      status: "approved",
      reasons: [],
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    adapter: "mock",
  }),

  // Digital Activation
  "activation.config": () => ({
    requiredFields: ["firstName", "lastName", "dateOfBirth", "ssn", "memberNumber"],
    credentialRules: { usernameMinLength: 6, passwordMinLength: 8, requireMFA: false },
    mfaMethods: ["sms", "email"],
    termsDocuments: [],
    passkeyEnabled: false,
    deviceRegistrationEnabled: false,
  }),
  "activation.verifyIdentity": () => ({
    verified: true,
    activationToken: "demo-activation-token",
    memberId: DEMO_USER.id,
    memberName: "Demo User",
  }),
  "activation.acceptTerms": () => ({
    accepted: true,
    documents: [],
  }),
  "activation.createCredentials": () => ({
    created: true,
    username: "demouser",
  }),
  "activation.enrollMFA": () => ({
    enrolled: true,
    method: "sms",
    destination: "***-***-4567",
    codeSent: true,
  }),
  "activation.verifyMFA": () => ({
    verified: true,
    method: "sms",
  }),
  "activation.passkeyOptions": () => ({
    challenge: "demo-challenge",
    rpName: tenantConfig.name,
    rpId: "localhost",
    userId: DEMO_USER.id,
    userName: DEMO_USER.email,
  }),
  "activation.registerPasskey": () => ({
    registered: true,
    credentialId: "demo-credential-id",
  }),
  "activation.registerDevice": () => ({
    registered: true,
    deviceId: "demo-device-id",
    deviceLabel: "Chrome on macOS",
  }),
  "activation.complete": () => ({
    status: "completed",
    message: `Activation complete. Welcome to ${tenantConfig.name}!`,
  }),
  "activation.checkTermsStatus": () => ({
    upToDate: true,
    pendingDocuments: [],
  }),
  "activation.getTerms": () => ({
    documents: [],
  }),
  "activation.createTermsVersion": () => ({
    document: {
      id: "terms-demo-001",
      type: "terms_of_service",
      title: "Terms of Service",
      content: "Demo terms content.",
      version: "1.0",
      mandatory: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  }),
  "activation.getTermsAcceptances": () => ({
    acceptances: [],
  }),
};
