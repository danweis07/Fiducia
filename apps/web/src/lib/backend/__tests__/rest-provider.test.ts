import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRestProvider } from "../rest-provider";
import type { BackendProvider } from "../types";

describe("REST Backend Provider", () => {
  let provider: BackendProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = createRestProvider();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('has name "rest"', () => {
    expect(provider.name).toBe("rest");
  });

  it("has auth, gateway, and realtime providers", () => {
    expect(provider.auth).toBeDefined();
    expect(provider.gateway).toBeDefined();
    expect(provider.realtime).toBeDefined();
  });

  // ===========================================================================
  // AUTH
  // ===========================================================================

  describe("auth", () => {
    describe("getSession", () => {
      it("returns null when no session stored", async () => {
        const result = await provider.auth.getSession();
        expect(result).toBeNull();
      });

      it("returns session from sessionStorage", async () => {
        const session = { user: { id: "u-1", email: "a@b.com" }, accessToken: "tok" };
        sessionStorage.setItem("rest_session", JSON.stringify(session));
        const result = await provider.auth.getSession();
        expect(result?.user.id).toBe("u-1");
        expect(result?.session.accessToken).toBe("tok");
      });

      it("returns null for corrupted sessionStorage", async () => {
        sessionStorage.setItem("rest_session", "not-json");
        const result = await provider.auth.getSession();
        expect(result).toBeNull();
      });
    });

    describe("signInWithPassword", () => {
      it("stores session on success", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: "u-1", email: "a@b.com" },
              accessToken: "tok-123",
              refreshToken: "ref-456",
            }),
        });

        const result = await provider.auth.signInWithPassword("a@b.com", "pass");
        expect(result.error).toBeNull();
        expect(result.user?.id).toBe("u-1");
        expect(sessionStorage.getItem("rest_session")).toContain("tok-123");
      });

      it("returns error on failure", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          json: () => Promise.resolve({ message: "Invalid credentials" }),
          statusText: "Unauthorized",
        });

        const result = await provider.auth.signInWithPassword("a@b.com", "wrong");
        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain("Invalid credentials");
      });

      it("notifies auth change listeners on sign in", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: "u-1", email: "a@b.com" },
              accessToken: "tok",
            }),
        });

        const callback = vi.fn();
        provider.auth.onAuthStateChange(callback);
        await provider.auth.signInWithPassword("a@b.com", "pass");
        expect(callback).toHaveBeenCalledWith(
          "SIGNED_IN",
          expect.objectContaining({ accessToken: "tok" }),
        );
      });
    });

    describe("signUp", () => {
      it("stores session when token returned", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: "u-2", email: "new@b.com" },
              accessToken: "new-tok",
            }),
        });

        const result = await provider.auth.signUp("new@b.com", "pass");
        expect(result.error).toBeNull();
        expect(result.user?.id).toBe("u-2");
      });

      it("returns error on failure", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          json: () => Promise.resolve({ message: "Email taken" }),
          statusText: "Conflict",
        });

        const result = await provider.auth.signUp("taken@b.com", "pass");
        expect(result.error).toBeTruthy();
      });
    });

    describe("signOut", () => {
      it("clears session and notifies listeners", async () => {
        sessionStorage.setItem(
          "rest_session",
          JSON.stringify({ user: { id: "u-1" }, accessToken: "tok" }),
        );
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

        const callback = vi.fn();
        provider.auth.onAuthStateChange(callback);
        await provider.auth.signOut();
        expect(sessionStorage.getItem("rest_session")).toBeNull();
        expect(callback).toHaveBeenCalledWith("SIGNED_OUT", null);
      });

      it("clears session even if API call fails", async () => {
        sessionStorage.setItem(
          "rest_session",
          JSON.stringify({ user: { id: "u-1" }, accessToken: "tok" }),
        );
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

        await provider.auth.signOut();
        expect(sessionStorage.getItem("rest_session")).toBeNull();
      });
    });

    describe("resetPassword", () => {
      it("returns no error on success", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const result = await provider.auth.resetPassword("a@b.com");
        expect(result.error).toBeNull();
      });

      it("returns error on failure", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          json: () => Promise.resolve({ message: "User not found" }),
          statusText: "Not Found",
        });

        const result = await provider.auth.resetPassword("unknown@b.com");
        expect(result.error).toBeTruthy();
      });
    });

    describe("updatePassword", () => {
      it("returns no error on success", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const result = await provider.auth.updatePassword("newpass");
        expect(result.error).toBeNull();
      });
    });

    describe("onAuthStateChange", () => {
      it("returns unsubscribe function", () => {
        const callback = vi.fn();
        const unsub = provider.auth.onAuthStateChange(callback);
        expect(typeof unsub.unsubscribe).toBe("function");
      });

      it("unsubscribe stops notifications", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({ user: { id: "u-1", email: "a@b.com" }, accessToken: "tok" }),
        });

        const callback = vi.fn();
        const unsub = provider.auth.onAuthStateChange(callback);
        unsub.unsubscribe();

        await provider.auth.signInWithPassword("a@b.com", "pass");
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe("getTenantContext", () => {
      it("returns tenant context from API", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              tenantId: "t-1",
              tenantName: "Test Bank",
              userId: "u-1",
              userRole: "admin",
            }),
        });

        const ctx = await provider.auth.getTenantContext("u-1");
        expect(ctx.tenantId).toBe("t-1");
      });

      it("returns default context on API failure", async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("fail"));
        const ctx = await provider.auth.getTenantContext("u-1");
        expect(ctx.tenantId).toBe("default");
        expect(ctx.tenantName).toBe("Demo Bank");
      });
    });

    describe("createTenant", () => {
      it("returns no error on success", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const result = await provider.auth.createTenant("u-1", "a@b.com", "My Bank");
        expect(result.error).toBeNull();
      });

      it("returns error on failure", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          json: () => Promise.resolve({ message: "Limit reached" }),
          statusText: "Forbidden",
        });

        const result = await provider.auth.createTenant("u-1", "a@b.com");
        expect(result.error).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // GATEWAY
  // ===========================================================================

  describe("gateway", () => {
    describe("invoke", () => {
      it("calls /api/gateway with action and params", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: { accounts: [] } }),
        });

        const result = await provider.gateway.invoke("accounts.list", {});
        expect(result.data).toEqual({ accounts: [] });
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/gateway"),
          expect.objectContaining({ method: "POST" }),
        );
      });

      it("returns error on fetch failure", async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
        const result = await provider.gateway.invoke("accounts.list", {});
        expect(result.error?.code).toBe("INVOKE_ERROR");
        expect(result.error?.message).toContain("Network error");
      });

      it("includes auth token in header when available", async () => {
        sessionStorage.setItem("rest_session", JSON.stringify({ accessToken: "my-token" }));
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });

        await provider.gateway.invoke("test.action", {});
        const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(fetchCall[1].headers.Authorization).toBe("Bearer my-token");
      });
    });

    describe("graphql", () => {
      it("sends graphql query", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: { user: { name: "Test" } } }),
        });

        const result = await provider.gateway.graphql!("query { user { name } }");
        expect(result.data).toBeDefined();
      });

      it("returns error on failure", async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("fail"));
        const result = await provider.gateway.graphql!("{}");
        expect(result.error?.code).toBe("INVOKE_ERROR");
      });
    });
  });

  // ===========================================================================
  // REALTIME
  // ===========================================================================

  describe("realtime", () => {
    it("subscribe returns an unsubscribe function", () => {
      const unsub = provider.realtime.subscribe({
        channel: "test-channel",
        table: "tasks",
        event: "*",
        schema: "public",
        onData: vi.fn(),
        onError: vi.fn(),
      });
      expect(typeof unsub.unsubscribe).toBe("function");
      unsub.unsubscribe();
    });
  });
});
