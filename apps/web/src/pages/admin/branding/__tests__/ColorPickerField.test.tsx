import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { ColorPickerField } from "../ColorPickerField";

describe("ColorPickerField", () => {
  const defaultProps = {
    label: "Primary Color",
    value: "215 50% 25%",
    onChange: vi.fn(),
    id: "test-color",
  };

  it("renders the label", () => {
    render(createElement(ColorPickerField, defaultProps));
    expect(screen.getByText("Primary Color")).toBeTruthy();
  });

  it("displays the hex value converted from HSL", () => {
    render(createElement(ColorPickerField, defaultProps));
    // The hex input should contain a valid hex color
    const inputs = screen.getAllByRole("textbox");
    const hexInput = inputs[0];
    expect((hexInput as HTMLInputElement).value).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("calls onChange with HSL string when hex input changes", () => {
    const onChange = vi.fn();
    render(createElement(ColorPickerField, { ...defaultProps, onChange }));
    const inputs = screen.getAllByRole("textbox");
    const hexInput = inputs[0];

    fireEvent.change(hexInput, { target: { value: "#ff0000" } });
    expect(onChange).toHaveBeenCalledWith("0 100% 50%");
  });

  it("does not call onChange for invalid hex input", () => {
    const onChange = vi.fn();
    render(createElement(ColorPickerField, { ...defaultProps, onChange }));
    const inputs = screen.getAllByRole("textbox");
    const hexInput = inputs[0];

    fireEvent.change(hexInput, { target: { value: "#xyz" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange when color picker input changes", () => {
    const onChange = vi.fn();
    render(createElement(ColorPickerField, { ...defaultProps, onChange }));
    const colorInput = document.getElementById("test-color") as HTMLInputElement;

    fireEvent.change(colorInput, { target: { value: "#00ff00" } });
    expect(onChange).toHaveBeenCalledWith("120 100% 50%");
  });

  it("handles fallback for invalid HSL value", () => {
    render(createElement(ColorPickerField, { ...defaultProps, value: "invalid" }));
    // Should not crash, should show fallback
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toBeTruthy();
  });
});
