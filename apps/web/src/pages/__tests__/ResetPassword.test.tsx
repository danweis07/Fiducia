import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(() => mockNavigate),
}));

const mockUpdatePassword = vi.fn();
vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn(() => ({
    auth: {
      updatePassword: mockUpdatePassword,
    },
  })),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

import ResetPassword from "../ResetPassword";

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
  });

  it("shows invalid link when no recovery token", () => {
    render(<ResetPassword />);
    expect(screen.getByText("Invalid Link")).toBeTruthy();
    expect(screen.getByText("Go to Sign In")).toBeTruthy();
  });

  it('navigates to auth on "Go to Sign In" click', () => {
    render(<ResetPassword />);
    fireEvent.click(screen.getByText("Go to Sign In"));
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });

  it("shows reset form when recovery token in hash", () => {
    window.location.hash = "#type=recovery&access_token=abc";
    render(<ResetPassword />);
    expect(screen.getByText("Set New Password")).toBeTruthy();
    expect(screen.getByLabelText("New Password")).toBeTruthy();
    expect(screen.getByLabelText("Confirm Password")).toBeTruthy();
  });

  it("shows validation errors for short password", async () => {
    window.location.hash = "#type=recovery";
    render(<ResetPassword />);
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeTruthy();
    });
  });

  it("shows mismatch error", async () => {
    window.location.hash = "#type=recovery";
    render(<ResetPassword />);
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeTruthy();
    });
  });

  it("calls updatePassword on valid submission", async () => {
    window.location.hash = "#type=recovery";
    mockUpdatePassword.mockResolvedValue({ error: null });
    render(<ResetPassword />);
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith("newpassword123");
    });
  });
});
