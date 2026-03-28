import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

const noop = () => {};
const fieldError = () => null;

const mockForm = {
  selectedProductId: "prod-1",
  selectedLoanType: "personal",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "555-1234",
  addressLine1: "123 Main St",
  addressLine2: "",
  city: "Springfield",
  state: "IL",
  zip: "62704",
  employmentStatus: "employed",
  employerName: "Acme Corp",
  annualIncomeDollars: "50000",
  yearsEmployed: "5",
  requestedAmountDollars: "10000",
  termMonths: "36",
  purpose: "home_improvement",
  additionalNotes: "",
  hasCoApplicant: false,
  coFirstName: "",
  coLastName: "",
  coEmail: "",
  coPhone: "",
};

const mockProduct = {
  id: "prod-1",
  name: "Personal Loan",
  loanType: "personal",
  interestRateBps: 599,
  rateType: "fixed",
  minAmountCents: 100000,
  maxAmountCents: 5000000,
  originationFeeBps: 100,
  termOptions: [12, 24, 36, 48, 60],
};

describe("Loan Application Steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DocumentsStep renders without crashing", async () => {
    const { DocumentsStep } = await import("../loan-application/DocumentsStep");
    const { container } = render(
      createElement(DocumentsStep, {
        selectedLoanType: "personal",
        documents: [],
        onDocumentUpload: noop,
        onNext: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("EmploymentStep renders without crashing", async () => {
    const { EmploymentStep } = await import("../loan-application/EmploymentStep");
    const { container } = render(
      createElement(EmploymentStep, {
        form: mockForm,
        fieldError,
        updateField: noop,
        onNext: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("LoanDetailsStep renders without crashing", async () => {
    const { LoanDetailsStep } = await import("../loan-application/LoanDetailsStep");
    const { container } = render(
      createElement(LoanDetailsStep, {
        form: mockForm,
        selectedProduct: mockProduct as never,
        termOptions: [12, 24, 36, 48, 60],
        fieldError,
        updateField: noop,
        onNext: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("PersonalInfoStep renders without crashing", async () => {
    const { PersonalInfoStep } = await import("../loan-application/PersonalInfoStep");
    const { container } = render(
      createElement(PersonalInfoStep, {
        form: mockForm,
        fieldError,
        updateField: noop,
        onNext: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("ReviewStep renders without crashing", async () => {
    const { ReviewStep } = await import("../loan-application/ReviewStep");
    const { container } = render(
      createElement(ReviewStep, {
        form: mockForm,
        selectedProduct: mockProduct as never,
        documents: [{ name: "id.pdf", uploaded: true }],
        errors: {},
        isSubmitting: false,
        onSubmit: noop,
        onBack: noop,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("SubmittedStep renders without crashing", async () => {
    const { SubmittedStep } = await import("../loan-application/SubmittedStep");
    const { container } = render(
      createElement(SubmittedStep, {
        applicationId: "app-123",
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });

  it("SubmittedStep renders with null applicationId", async () => {
    const { SubmittedStep } = await import("../loan-application/SubmittedStep");
    const { container } = render(
      createElement(SubmittedStep, {
        applicationId: null,
      }),
      { wrapper: createWrapper() },
    );
    expect(container).toBeTruthy();
  });
});
