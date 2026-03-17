import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/common/error-messages", () => ({
  extractErrorCode: vi.fn().mockReturnValue(null),
  getErrorMessage: vi.fn().mockReturnValue(null),
}));

import { extractErrorCode, getErrorMessage } from "@/lib/common/error-messages";
import { useErrorHandler } from "../useErrorHandler";

describe("useErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns handleError function", () => {
    const { result } = renderHook(() => useErrorHandler());
    expect(result.current.handleError).toBeDefined();
    expect(typeof result.current.handleError).toBe("function");
  });

  it("shows toast on error", () => {
    const { result } = renderHook(() => useErrorHandler());

    const errorInfo = result.current.handleError(new Error("Something broke"));

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(errorInfo.title).toBe("Something went wrong");
    expect(errorInfo.message).toBe("Something broke");
  });

  it("uses fallback title from options", () => {
    const { result } = renderHook(() => useErrorHandler());

    const errorInfo = result.current.handleError(new Error("err"), {
      fallbackTitle: "Transfer failed",
    });

    expect(errorInfo.title).toBe("Transfer failed");
  });

  it("uses mapped error when code is found", () => {
    vi.mocked(extractErrorCode).mockReturnValue("INSUFFICIENT_FUNDS");
    vi.mocked(getErrorMessage).mockReturnValue({
      title: "Insufficient Funds",
      message: "Not enough balance",
      action: "Add funds",
      severity: "error",
    });

    const { result } = renderHook(() => useErrorHandler());

    const errorInfo = result.current.handleError(new Error("err"));

    expect(errorInfo.title).toBe("Insufficient Funds");
    expect(errorInfo.message).toBe("Not enough balance");
    expect(errorInfo.action).toBe("Add funds");
    expect(errorInfo.code).toBe("INSUFFICIENT_FUNDS");
  });

  it("does not show toast when silent is true", () => {
    const { result } = renderHook(() => useErrorHandler());

    result.current.handleError(new Error("err"), { silent: true });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("returns error info object", () => {
    const { result } = renderHook(() => useErrorHandler());

    const errorInfo = result.current.handleError("unknown error");

    expect(errorInfo).toHaveProperty("title");
    expect(errorInfo).toHaveProperty("message");
    expect(errorInfo).toHaveProperty("action");
    expect(errorInfo).toHaveProperty("code");
  });
});
