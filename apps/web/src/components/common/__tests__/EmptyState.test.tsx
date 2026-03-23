import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No transactions"
        description="You have no transactions yet."
      />,
    );
    expect(screen.getByText("No transactions")).toBeTruthy();
    expect(screen.getByText("You have no transactions yet.")).toBeTruthy();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Nothing here."
        action={{ label: "Add Item", onClick }}
      />,
    );
    const button = screen.getByText("Add Item");
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });

  it("does not render action button when not provided", () => {
    render(<EmptyState icon={Inbox} title="Empty" description="No data." />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
