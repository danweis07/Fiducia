import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToast, toast, reducer } from "../use-toast";

describe("use-toast", () => {
  describe("reducer", () => {
    it("ADD_TOAST adds a toast", () => {
      const state = { toasts: [] };
      const result = reducer(state, {
        type: "ADD_TOAST",
        toast: { id: "1", title: "Hello", open: true, onOpenChange: vi.fn() },
      });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe("1");
    });

    it("UPDATE_TOAST updates matching toast", () => {
      const state = {
        toasts: [{ id: "1", title: "Old", open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "New" },
      });
      expect(result.toasts[0].title).toBe("New");
    });

    it("DISMISS_TOAST sets open to false", () => {
      const state = {
        toasts: [{ id: "1", title: "Test", open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, {
        type: "DISMISS_TOAST",
        toastId: "1",
      });
      expect(result.toasts[0].open).toBe(false);
    });

    it("REMOVE_TOAST removes the toast", () => {
      const state = {
        toasts: [{ id: "1", title: "Test", open: true, onOpenChange: vi.fn() }],
      };
      const result = reducer(state, {
        type: "REMOVE_TOAST",
        toastId: "1",
      });
      expect(result.toasts).toHaveLength(0);
    });

    it("REMOVE_TOAST without id clears all", () => {
      const state = {
        toasts: [
          { id: "1", title: "T1", open: true, onOpenChange: vi.fn() },
          { id: "2", title: "T2", open: true, onOpenChange: vi.fn() },
        ],
      };
      const result = reducer(state, {
        type: "REMOVE_TOAST",
        toastId: undefined,
      });
      expect(result.toasts).toHaveLength(0);
    });
  });

  describe("useToast hook", () => {
    it("returns toast function and dismiss", () => {
      const { result } = renderHook(() => useToast());
      expect(typeof result.current.toast).toBe("function");
      expect(typeof result.current.dismiss).toBe("function");
      expect(Array.isArray(result.current.toasts)).toBe(true);
    });
  });

  describe("toast function", () => {
    it("creates a toast and returns id, dismiss, update", () => {
      const result = toast({ title: "Test Toast" });
      expect(result.id).toBeDefined();
      expect(typeof result.dismiss).toBe("function");
      expect(typeof result.update).toBe("function");
    });
  });
});
