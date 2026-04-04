import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to create mocks that are available in vi.mock factory
const {
  mockAuth,
  mockChannel: _mockChannel,
  mockFrom,
  mockFunctionsInvoke,
  mockRemoveChannel,
  mockRemoveAllChannels,
  mockChannelFn,
  mockFromFn,
} = vi.hoisted(() => {
  const mockAuth = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  };

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    track: vi.fn(),
    presenceState: vi.fn().mockReturnValue({}),
    send: vi.fn().mockResolvedValue(undefined),
  };

  const mockFrom = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  const mockFunctionsInvoke = vi.fn();
  const mockRemoveChannel = vi.fn();
  const mockRemoveAllChannels = vi.fn();
  const mockChannelFn = vi.fn(() => mockChannel);
  const mockFromFn = vi.fn(() => mockFrom);

  return {
    mockAuth,
    mockChannel,
    mockFrom,
    mockFunctionsInvoke,
    mockRemoveChannel,
    mockRemoveAllChannels,
    mockChannelFn,
    mockFromFn,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: mockAuth,
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel,
    removeAllChannels: mockRemoveAllChannels,
    functions: { invoke: mockFunctionsInvoke },
    from: mockFromFn,
  },
}));

vi.mock("@/types", () => ({
  getRolePermissions: vi.fn(() => ["read", "write"]),
}));

import { createSupabaseProvider } from "../supabase-provider";
import type { BackendProvider } from "../types";

describe("Supabase Backend Provider", () => {
  let provider: BackendProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.select.mockReturnThis();
    mockFrom.insert.mockReturnThis();
    mockFrom.update.mockReturnThis();
    mockFrom.eq.mockReturnThis();
    provider = createSupabaseProvider();
  });

  it('has name "supabase"', () => {
    expect(provider.name).toBe("supabase");
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
      it("returns null when no session", async () => {
        mockAuth.getSession.mockResolvedValue({
          data: { session: null },
        });
        const result = await provider.auth.getSession();
        expect(result).toBeNull();
      });

      it("returns mapped session when authenticated", async () => {
        mockAuth.getSession.mockResolvedValue({
          data: {
            session: {
              user: { id: "u-1", email: "test@example.com" },
              access_token: "at-123",
              refresh_token: "rt-456",
              expires_at: 9999999,
            },
          },
        });
        const result = await provider.auth.getSession();
        expect(result?.user.id).toBe("u-1");
        expect(result?.session.accessToken).toBe("at-123");
        expect(result?.session.refreshToken).toBe("rt-456");
      });
    });

    describe("signInWithPassword", () => {
      it("returns user on success", async () => {
        mockAuth.signInWithPassword.mockResolvedValue({
          data: {
            user: { id: "u-1", email: "test@example.com" },
            session: { access_token: "tok", refresh_token: "ref" },
          },
          error: null,
        });
        const result = await provider.auth.signInWithPassword("test@example.com", "pass");
        expect(result.error).toBeNull();
        expect(result.user?.id).toBe("u-1");
      });

      it("returns error on failure", async () => {
        mockAuth.signInWithPassword.mockResolvedValue({
          data: { user: null },
          error: new Error("Invalid credentials"),
        });
        const result = await provider.auth.signInWithPassword("test@example.com", "wrong");
        expect(result.error).toBeTruthy();
      });
    });

    describe("signUp", () => {
      it("returns user on success", async () => {
        mockAuth.signUp.mockResolvedValue({
          data: { user: { id: "u-2", email: "new@example.com" } },
          error: null,
        });
        const result = await provider.auth.signUp("new@example.com", "pass");
        expect(result.error).toBeNull();
        expect(result.user?.id).toBe("u-2");
      });

      it("returns error on failure", async () => {
        mockAuth.signUp.mockResolvedValue({
          data: { user: null },
          error: new Error("Email taken"),
        });
        const result = await provider.auth.signUp("taken@example.com", "pass");
        expect(result.error).toBeTruthy();
      });
    });

    describe("signOut", () => {
      it("calls supabase signOut", async () => {
        mockAuth.signOut.mockResolvedValue({ error: null });
        await provider.auth.signOut();
        expect(mockAuth.signOut).toHaveBeenCalled();
      });
    });

    describe("resetPassword", () => {
      it("returns no error on success", async () => {
        mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
        const result = await provider.auth.resetPassword("test@example.com");
        expect(result.error).toBeNull();
      });

      it("returns error on failure", async () => {
        const err = new Error("User not found");
        mockAuth.resetPasswordForEmail.mockResolvedValue({ error: err });
        const result = await provider.auth.resetPassword("unknown@example.com");
        expect(result.error).toBe(err);
      });
    });

    describe("updatePassword", () => {
      it("returns no error on success", async () => {
        mockAuth.updateUser.mockResolvedValue({ error: null });
        const result = await provider.auth.updatePassword("newpass");
        expect(result.error).toBeNull();
        expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: "newpass" });
      });
    });

    describe("onAuthStateChange", () => {
      it("returns unsubscribe function", () => {
        const mockUnsubscribe = vi.fn();
        mockAuth.onAuthStateChange.mockReturnValue({
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        });

        const unsub = provider.auth.onAuthStateChange(vi.fn());
        expect(typeof unsub.unsubscribe).toBe("function");
        unsub.unsubscribe();
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    describe("getTenantContext", () => {
      it("returns default context on firm_users lookup failure", async () => {
        mockFrom.single.mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        });

        const ctx = await provider.auth.getTenantContext("u-1");
        expect(ctx.tenantId).toBe("default");
        expect(ctx.tenantName).toBe("Demo Credit Union");
        expect(ctx.userRole).toBe("member");
      });
    });
  });

  // ===========================================================================
  // GATEWAY
  // ===========================================================================

  describe("gateway", () => {
    it("invokes edge function", async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { data: { accounts: [] } },
        error: null,
      });
      const result = await provider.gateway.invoke("accounts.list", {});
      expect(result).toEqual({ data: { accounts: [] } });
    });

    it("returns error on invoke failure", async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: "Edge function error" },
      });
      const result = await provider.gateway.invoke("accounts.list", {});
      expect(result.error?.code).toBe("INVOKE_ERROR");
    });

    it("supports graphql", async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { data: { user: { name: "Test" } } },
        error: null,
      });
      const result = await provider.gateway.graphql!("query { user { name } }");
      expect(result).toBeDefined();
    });
  });

  // ===========================================================================
  // REALTIME
  // ===========================================================================

  describe("realtime", () => {
    it("has type supabase", () => {
      expect(provider.realtime.type).toBe("supabase");
    });

    it("subscribe returns unsubscribe function", () => {
      const unsub = provider.realtime.subscribe({
        channel: "test",
        table: "accounts",
        onData: vi.fn(),
      });
      expect(typeof unsub.unsubscribe).toBe("function");
    });

    it("subscribeChannel returns unsubscribe function", () => {
      const unsub = provider.realtime.subscribeChannel!({
        channel: "transfers",
        onMessage: vi.fn(),
      });
      expect(typeof unsub.unsubscribe).toBe("function");
    });

    it("disconnect removes all channels", () => {
      provider.realtime.disconnect!();
      expect(mockRemoveAllChannels).toHaveBeenCalled();
    });
  });
});
