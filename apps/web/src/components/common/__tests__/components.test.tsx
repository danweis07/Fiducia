import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Spinner, PageSpinner } from "../Spinner";
import { EmptyState } from "../EmptyState";
import { FormField } from "../FormField";
import { Stepper } from "../Stepper";
import { TransactionRow } from "../TransactionRow";
import { SuccessAnimation } from "../SuccessAnimation";
import { AccountCardSkeleton, TransactionRowSkeleton, PageSkeleton } from "../LoadingSkeleton";
import { StatusBadge } from "../StatusBadge";
import { Bell } from "lucide-react";

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

describe("Spinner", () => {
  it("renders with default size", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders with custom size", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector(".h-8")).toBeTruthy();
  });
});

describe("PageSpinner", () => {
  it("renders with loading role", () => {
    render(<PageSpinner />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Loading...")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />);
    expect(screen.getByText("No notifications")).toBeTruthy();
    expect(screen.getByText("You're all caught up!")).toBeTruthy();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Bell}
        title="Empty"
        description="Nothing here"
        action={{ label: "Add Item", onClick }}
      />,
    );
    const button = screen.getByText("Add Item");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// FormField
// ---------------------------------------------------------------------------

describe("FormField", () => {
  it("renders label and children", () => {
    render(
      <FormField id="test" label="Email">
        <input id="test" />
      </FormField>,
    );
    expect(screen.getByText("Email")).toBeTruthy();
  });

  it("shows error message", () => {
    render(
      <FormField id="test" label="Email" error="Invalid email">
        <input id="test" />
      </FormField>,
    );
    expect(screen.getByText("Invalid email")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("shows required asterisk", () => {
    render(
      <FormField id="test" label="Email" required>
        <input id="test" />
      </FormField>,
    );
    expect(screen.getByText("*")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

describe("Stepper", () => {
  const steps = [{ label: "From" }, { label: "To" }, { label: "Amount" }, { label: "Done" }];

  it("renders all steps", () => {
    render(<Stepper steps={steps} currentStep={2} />);
    expect(screen.getByText("From")).toBeTruthy();
    expect(screen.getByText("To")).toBeTruthy();
    expect(screen.getByText("Amount")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
  });

  it("marks current step with aria-current", () => {
    const { container } = render(<Stepper steps={steps} currentStep={2} />);
    const current = container.querySelector('[aria-current="step"]');
    expect(current).toBeTruthy();
    expect(current!.textContent).toBe("2");
  });
});

// ---------------------------------------------------------------------------
// TransactionRow
// ---------------------------------------------------------------------------

describe("TransactionRow", () => {
  it("renders credit transaction in green", () => {
    render(<TransactionRow description="Payroll Deposit" amountCents={250000} category="income" />);
    expect(screen.getByText("Payroll Deposit")).toBeTruthy();
    expect(screen.getByText("+$2,500.00")).toBeTruthy();
  });

  it("renders debit transaction", () => {
    render(<TransactionRow description="Coffee Shop" amountCents={-450} category="dining" />);
    expect(screen.getByText("Coffee Shop")).toBeTruthy();
    expect(screen.getByText("$4.50")).toBeTruthy();
  });

  it("shows pending badge when status is pending", () => {
    render(<TransactionRow description="Transfer" amountCents={-10000} status="pending" />);
    expect(screen.getByText("Pending")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SuccessAnimation
// ---------------------------------------------------------------------------

describe("SuccessAnimation", () => {
  it("renders title and description", () => {
    render(<SuccessAnimation title="Transfer Complete" description="Your money is on its way." />);
    expect(screen.getByText("Transfer Complete")).toBeTruthy();
    expect(screen.getByText("Your money is on its way.")).toBeTruthy();
  });

  it("renders details when provided", () => {
    render(<SuccessAnimation title="Done" details={[{ label: "ID", value: "abc-123" }]} />);
    expect(screen.getByText("ID: abc-123")).toBeTruthy();
  });

  it("renders children", () => {
    render(
      <SuccessAnimation title="Done">
        <button>Next</button>
      </SuccessAnimation>,
    );
    expect(screen.getByText("Next")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// LoadingSkeleton
// ---------------------------------------------------------------------------

describe("LoadingSkeleton", () => {
  it("renders AccountCardSkeleton", () => {
    const { container } = render(<AccountCardSkeleton />);
    expect(container.querySelector(".rounded-lg")).toBeTruthy();
  });

  it("renders TransactionRowSkeleton", () => {
    const { container } = render(<TransactionRowSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders PageSkeleton", () => {
    const { container } = render(<PageSkeleton />);
    expect(container.querySelector(".space-y-6")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

describe("StatusBadge", () => {
  it("renders status text", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("active")).toBeTruthy();
  });
});
