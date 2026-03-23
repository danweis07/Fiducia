import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
    activation: {
      config: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "app-shell" }, children),
}));

const mockConfig = {
  tenantId: "test-tenant",
  tenantName: "Test Credit Union",
  identity: {
    requiredFields: ["accountNumber", "ssn", "dateOfBirth"],
    maxAttempts: 3,
    lockoutMinutes: 30,
  },
  credentials: {
    username: {
      minLength: 6,
      maxLength: 30,
      allowEmail: true,
      pattern: "^[a-zA-Z0-9._@]+$",
      patternDescription: "Letters, numbers, dots, underscores",
    },
    password: {
      minLength: 8,
      maxLength: 64,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecialChar: true,
      specialChars: "!@#$%^&*",
      disallowUsername: true,
      historyCount: 3,
    },
    passkey: {
      enabled: false,
      allowPasswordless: false,
      rpId: "test.com",
      rpName: "Test",
      authenticatorAttachment: "all" as const,
      requireResidentKey: false,
      userVerification: "preferred" as const,
      attestation: "none" as const,
    },
  },
  mfa: {
    required: true,
    allowedMethods: ["sms" as const],
    defaultMethod: "sms" as const,
    allowBackupCodes: true,
    backupCodeCount: 10,
  },
  passkey: {
    enabled: false,
    allowPasswordless: false,
    rpId: "test.com",
    rpName: "Test",
    authenticatorAttachment: "all" as const,
    requireResidentKey: false,
    userVerification: "preferred" as const,
    attestation: "none" as const,
  },
  device: {
    required: false,
    maxDevices: 5,
    collectFingerprint: true,
    trustDurationDays: 90,
  },
  terms: [],
  sessionTimeoutMinutes: 30,
};

vi.mock("@/hooks/useActivation", () => ({
  useActivationConfig: () => ({
    data: mockConfig,
    isLoading: false,
    isError: false,
  }),
  useVerifyIdentity: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useAcceptTerms: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useCreateCredentials: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useEnrollMFA: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useVerifyMFA: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useRegisterDevice: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useCompleteActivation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

import DigitalActivation from "../DigitalActivation";

describe("DigitalActivation", () => {
  it("renders without crashing", () => {
    render(createElement(DigitalActivation), { wrapper: createWrapper() });
    expect(document.body.querySelector('[data-testid="app-shell"]')).toBeTruthy();
  });

  it("renders the activation page with identity verification step", () => {
    render(createElement(DigitalActivation), { wrapper: createWrapper() });
    expect(screen.getByText("Verify Your Identity")).toBeTruthy();
  });

  it("renders progress stepper navigation", () => {
    render(createElement(DigitalActivation), { wrapper: createWrapper() });
    expect(screen.getByRole("navigation", { name: /activation progress/i })).toBeTruthy();
  });
});
