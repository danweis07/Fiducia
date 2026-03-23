import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/components/common/SecureInput", () => ({
  SecureInput: (props: Record<string, unknown>) =>
    createElement("input", { id: props.id, value: props.value, onChange: () => {} }),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: (cents: number) => `$${(cents / 100).toFixed(2)}`,
  formatInterestRate: (bps: number) => `${(bps / 100).toFixed(2)}%`,
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

const mockForm = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "555-1234",
  dateOfBirth: "1990-01-01",
  ssn: "123-45-6789",
  addressLine1: "123 Main St",
  addressLine2: "",
  city: "Springfield",
  state: "IL",
  zip: "62704",
  citizenship: "us_citizen",
  employmentStatus: "employed",
  selectedProductIds: ["prod-1"],
  fundingMethod: "none",
  fundingAmountDollars: "",
};

const noop = () => {};

describe("Account Opening Steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ConfirmationStep renders without crashing", async () => {
    const { ConfirmationStep } = await import("../account-opening/ConfirmationStep");
    const { container } = render(
      createElement(ConfirmationStep, {
        createdAccounts: [{ accountId: "a1", accountNumberMasked: "****1234", type: "checking" }],
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("FundingStep renders without crashing", async () => {
    const { FundingStep } = await import("../account-opening/FundingStep");
    const { container } = render(
      createElement(FundingStep, {
        form: mockForm,
        errors: {},
        allowedFundingMethods: ["ach_transfer", "none"],
        isSubmitting: false,
        updateField: noop,
        onSubmit: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("PersonalInfoStep renders without crashing", async () => {
    const { PersonalInfoStep } = await import("../account-opening/PersonalInfoStep");
    const { container } = render(
      createElement(PersonalInfoStep, {
        form: mockForm,
        errors: {},
        updateField: noop,
        onNext: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("ProcessingStep renders processing state", async () => {
    const { ProcessingStep } = await import("../account-opening/ProcessingStep");
    const { container } = render(
      createElement(ProcessingStep, {
        applicationStatus: null,
        onStartOver: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("ProcessingStep renders approved state", async () => {
    const { ProcessingStep } = await import("../account-opening/ProcessingStep");
    const { container } = render(
      createElement(ProcessingStep, {
        applicationStatus: "kyc_approved",
        onStartOver: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("ProcessingStep renders denied state", async () => {
    const { ProcessingStep } = await import("../account-opening/ProcessingStep");
    const { container } = render(
      createElement(ProcessingStep, {
        applicationStatus: "kyc_denied",
        onStartOver: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("ProductsStep renders without crashing", async () => {
    const { ProductsStep } = await import("../account-opening/ProductsStep");
    const { container } = render(
      createElement(ProductsStep, {
        products: [
          {
            id: "prod-1",
            type: "checking",
            name: "Basic Checking",
            description: "A basic account",
            apyBps: 25,
            minOpeningDepositCents: 2500,
            monthlyFeeCents: 0,
            isAvailable: true,
          },
        ],
        form: mockForm,
        errors: {},
        configLoading: false,
        updateField: noop,
        onNext: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("ReviewStep renders without crashing", async () => {
    const { ReviewStep } = await import("../account-opening/ReviewStep");
    const { container } = render(
      createElement(ReviewStep, {
        form: mockForm,
        products: [
          {
            id: "prod-1",
            type: "checking",
            name: "Basic Checking",
            description: "A basic account",
            apyBps: 25,
            minOpeningDepositCents: 2500,
            monthlyFeeCents: 0,
            isAvailable: true,
          },
        ],
        maskedSSN: "***-**-6789",
        isSubmitting: false,
        onSubmit: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });
});
