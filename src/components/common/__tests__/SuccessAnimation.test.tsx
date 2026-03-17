import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuccessAnimation } from "../SuccessAnimation";

describe("SuccessAnimation", () => {
  it("renders title", () => {
    render(<SuccessAnimation title="Payment Sent" />);
    expect(screen.getByText("Payment Sent")).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(<SuccessAnimation title="Done" description="Funds will arrive in 1-2 days." />);
    expect(screen.getByText("Funds will arrive in 1-2 days.")).toBeTruthy();
  });

  it("renders details list when provided", () => {
    render(
      <SuccessAnimation
        title="Transfer Complete"
        details={[
          { label: "Confirmation", value: "TXN-123" },
          { label: "Amount", value: "$50.00" },
        ]}
      />,
    );
    expect(screen.getByText("Confirmation: TXN-123")).toBeTruthy();
    expect(screen.getByText("Amount: $50.00")).toBeTruthy();
  });

  it("renders children when provided", () => {
    render(
      <SuccessAnimation title="Done">
        <button>Continue</button>
      </SuccessAnimation>,
    );
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("has polite aria-live for accessibility", () => {
    render(<SuccessAnimation title="Success" />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
