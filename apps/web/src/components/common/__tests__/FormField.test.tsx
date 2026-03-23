import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "../FormField";

describe("FormField", () => {
  it("renders label and children", () => {
    render(
      <FormField id="email" label="Email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("shows required asterisk when required", () => {
    const { container } = render(
      <FormField id="name" label="Name" required>
        <input id="name" />
      </FormField>,
    );
    expect(container.querySelector(".text-destructive")?.textContent).toBe("*");
  });

  it("displays error message with alert role", () => {
    render(
      <FormField id="amount" label="Amount" error="Amount is required">
        <input id="amount" />
      </FormField>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Amount is required")).toBeTruthy();
  });

  it("displays hint when no error", () => {
    render(
      <FormField id="memo" label="Memo" hint="Optional note">
        <input id="memo" />
      </FormField>,
    );
    expect(screen.getByText("Optional note")).toBeTruthy();
  });
});
