import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useActivation", () => ({
  useCreateCredentials: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAcceptTerms: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useEnrollMFA: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false })),
  useVerifyMFA: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false })),
  useRegisterDevice: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false })),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

const noop = () => {};

const mockConfig = {
  credentials: {
    username: {
      minLength: 6,
      maxLength: 32,
      pattern: "^[a-zA-Z0-9]+$",
      patternDescription: "Alphanumeric only",
      allowEmail: true,
    },
    password: {
      minLength: 8,
      maxLength: 64,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecial: true,
    },
  },
  mfa: {
    required: false,
    allowedMethods: ["totp" as const, "sms" as const],
  },
  terms: [
    {
      id: "terms-1",
      title: "Terms of Service",
      version: "1.0",
      content: "<p>Terms content</p>",
      mandatory: true,
      publishedAt: "2024-01-01T00:00:00Z",
    },
  ],
  device: {
    required: false,
    trustDurationDays: 30,
  },
};

describe("Activation Steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("StepComplete renders without crashing", async () => {
    const { StepComplete } = await import("../activation/CompleteStep");
    const { container } = render(
      createElement(StepComplete, {
        completedSteps: new Set(["identity", "terms"] as const),
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("StepCredentials renders without crashing", async () => {
    const { StepCredentials } = await import("../activation/CredentialsStep");
    const { container } = render(
      createElement(StepCredentials, {
        config: mockConfig as unknown,
        activationToken: "test-token",
        onComplete: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("StepDevice renders without crashing", async () => {
    const { StepDevice } = await import("../activation/DeviceStep");
    const { container } = render(
      createElement(StepDevice, {
        config: mockConfig as unknown,
        activationToken: "test-token",
        onComplete: noop,
        onBack: noop,
        onSkip: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("StepMFA renders method selection without crashing", async () => {
    const { StepMFA } = await import("../activation/MFAStep");
    const { container } = render(
      createElement(StepMFA, {
        config: mockConfig as unknown,
        activationToken: "test-token",
        onComplete: noop,
        onBack: noop,
        onSkip: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("StepTerms renders without crashing", async () => {
    const { StepTerms } = await import("../activation/TermsStep");
    const { container } = render(
      createElement(StepTerms, {
        config: mockConfig as unknown,
        activationToken: "test-token",
        onComplete: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });
});
