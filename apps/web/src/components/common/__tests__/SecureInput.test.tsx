import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SecureInput } from "../SecureInput";

describe("SecureInput", () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it("renders with label", () => {
    render(<SecureInput value="secret" onChange={vi.fn()} label="SSN" />);
    expect(screen.getByText("SSN")).toBeTruthy();
  });

  it("renders without label", () => {
    const { container } = render(<SecureInput value="secret" onChange={vi.fn()} />);
    expect(container.querySelector("label")).toBeNull();
  });

  it("displays masked value by default", () => {
    render(<SecureInput value="1234" onChange={vi.fn()} />);
    // Default mask char is bullet, 4 chars
    const input = screen.getByRole("textbox");
    expect(input).toHaveProperty("value");
    // Value should be masked (not the raw value)
    expect((input as HTMLInputElement).value).not.toBe("1234");
  });

  // ---------------------------------------------------------------------------
  // Toggle visibility
  // ---------------------------------------------------------------------------

  it("has show/hide toggle button", () => {
    render(<SecureInput value="secret" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Show value")).toBeTruthy();
  });

  it('toggles to "Hide value" after clicking show', () => {
    render(<SecureInput value="secret" onChange={vi.fn()} />);
    const toggle = screen.getByLabelText("Show value");
    fireEvent.click(toggle);
    expect(screen.getByLabelText("Hide value")).toBeTruthy();
  });

  it("shows actual value when revealed", () => {
    render(<SecureInput value="mySecret123" onChange={vi.fn()} />);
    const toggle = screen.getByLabelText("Show value");
    fireEvent.click(toggle);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("mySecret123");
  });

  it("hides value when toggled back to masked", () => {
    render(<SecureInput value="test" onChange={vi.fn()} />);
    const toggle = screen.getByLabelText("Show value");
    fireEvent.click(toggle); // Show
    fireEvent.click(screen.getByLabelText("Hide value")); // Hide
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).not.toBe("test");
  });

  // ---------------------------------------------------------------------------
  // onChange behavior
  // ---------------------------------------------------------------------------

  it("calls onChange when typing in revealed mode", () => {
    const onChange = vi.fn();
    render(<SecureInput value="abc" onChange={onChange} />);
    // First reveal
    fireEvent.click(screen.getByLabelText("Show value"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "abcd" } });
    expect(onChange).toHaveBeenCalledWith("abcd");
  });

  it("handles character addition in masked mode", () => {
    const onChange = vi.fn();
    render(<SecureInput value="abc" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    // Simulate adding a character (masked value length increases)
    const maskedValue = (input as HTMLInputElement).value;
    fireEvent.change(input, { target: { value: maskedValue + "d" } });
    expect(onChange).toHaveBeenCalledWith("abcd");
  });

  it("handles character deletion in masked mode", () => {
    const onChange = vi.fn();
    render(<SecureInput value="abcd" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    const maskedValue = (input as HTMLInputElement).value;
    // Remove last character
    fireEvent.change(input, { target: { value: maskedValue.slice(0, -1) } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  // ---------------------------------------------------------------------------
  // Empty value
  // ---------------------------------------------------------------------------

  it("handles empty value", () => {
    render(<SecureInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("");
  });

  // ---------------------------------------------------------------------------
  // Custom mask character
  // ---------------------------------------------------------------------------

  it("uses custom mask character", () => {
    render(<SecureInput value="123" onChange={vi.fn()} maskChar="*" />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("***");
  });

  // ---------------------------------------------------------------------------
  // Label generates id
  // ---------------------------------------------------------------------------

  it("generates id from label", () => {
    render(<SecureInput value="" onChange={vi.fn()} label="Account Number" />);
    const input = document.getElementById("account-number");
    expect(input).toBeTruthy();
  });

  it("uses explicit id over generated one", () => {
    render(<SecureInput value="" onChange={vi.fn()} label="SSN" id="custom-ssn" />);
    const input = document.getElementById("custom-ssn");
    expect(input).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  it("toggle button has correct aria-label", () => {
    render(<SecureInput value="test" onChange={vi.fn()} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Show value");
  });

  it("toggle button type is button (not submit)", () => {
    render(<SecureInput value="test" onChange={vi.fn()} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("type")).toBe("button");
  });

  // ---------------------------------------------------------------------------
  // Long values
  // ---------------------------------------------------------------------------

  it("handles long value", () => {
    const longValue = "a".repeat(100);
    render(<SecureInput value={longValue} onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value.length).toBe(100);
  });
});
