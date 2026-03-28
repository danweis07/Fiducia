/**
 * Auth & Tenant Context — Split Providers
 *
 * Two separate React contexts to avoid unnecessary re-renders:
 *   1. AuthContext — user, session, signIn/signUp/signOut/resetPassword
 *   2. TenantStateContext — tenant, permissions, features, region
 *
 * Public API remains unchanged: useAuth(), useTenant(), useTenantOrNull()
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { getBackend } from "@/lib/backend";
import type { AuthUser, AuthSession } from "@/lib/backend/types";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { tenantConfig } from "@/lib/tenant.config";
import { setDefaultCurrency } from "@/lib/common/currency";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { IdleTimeoutWarning } from "@/components/common/IdleTimeoutWarning";
import type {
  TenantContext as TenantContextType,
  Tenant,
  TenantUser,
  TenantPermission,
  TenantFeatures,
} from "@/types";
import { getRolePermissions } from "@/types";

/** Default session timeout configuration */
const DEFAULT_SESSION_TIMEOUT_MINUTES = 15;
const DEFAULT_SESSION_GRACE_MINUTES = 2;

// =============================================================================
// DEFAULT FEATURES
// =============================================================================

export const DEFAULT_FEATURES: TenantFeatures = {
  rdc: true,
  billPay: true,
  p2p: false,
  cardControls: true,
  externalTransfers: true,
  wires: false,
  mobileDeposit: true,
  directDeposit: false,
  openBanking: false,
  sca: false,
  confirmationOfPayee: false,
  multiCurrency: false,
  internationalPayments: false,
  internationalBillPay: false,
  openBankingAggregation: false,
  aliasPayments: false,
  amlScreening: false,
  instantPayments: false,
};

// =============================================================================
// AUTH CONTEXT (user session + auth actions)
// =============================================================================

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    tenantName?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// =============================================================================
// TENANT CONTEXT (tenant state + permissions + features)
// =============================================================================

interface TenantContextValue {
  tenant: TenantContextType | null;
  tenantRecord: Tenant | null;
  tenantUser: TenantUser | null;
  tenantLoading: boolean;
  tenantError: string | null;
  hasPermission: (permission: TenantPermission) => boolean;
  hasAnyPermission: (permissions: TenantPermission[]) => boolean;
  hasAllPermissions: (permissions: TenantPermission[]) => boolean;
  isOwnerOrAdmin: () => boolean;
  refreshTenant: () => Promise<void>;
}

const TenantStateContext = createContext<TenantContextValue | undefined>(undefined);

// =============================================================================
// COMBINED PROVIDER
// =============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  // --- Auth state ---
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Tenant state ---
  const [tenant, setTenant] = useState<TenantContextType | null>(null);
  const [tenantRecord, setTenantRecord] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const fetchTenantContext = useCallback(async (userId: string) => {
    setTenantLoading(true);
    setTenantError(null);

    try {
      const backend = getBackend();
      const ctx = await backend.auth.getTenantContext(userId);
      setTenant(ctx);
      if (ctx.defaultCurrency) setDefaultCurrency(ctx.defaultCurrency);
    } catch {
      // Handled by fallback
      setTenant({
        tenantId: "default",
        tenantName: tenantConfig.name,
        userId,
        userRole: "member",
        displayName: "Customer",
        permissions: getRolePermissions("member"),
        subscriptionTier: "professional",
        features: DEFAULT_FEATURES,
        region: "us",
        country: "US",
        defaultCurrency: "USD",
        sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
        sessionGraceMinutes: DEFAULT_SESSION_GRACE_MINUTES,
      });
    } finally {
      setTenantLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDemoMode()) {
      const syntheticUser: AuthUser = { id: DEMO_USER.id, email: DEMO_USER.email };
      setUser(syntheticUser);
      setSession({ user: syntheticUser });
      setTenant({
        tenantId: "demo-tenant",
        tenantName: tenantConfig.name,
        userId: DEMO_USER.id,
        userRole: "owner",
        displayName: DEMO_USER.displayName,
        permissions: getRolePermissions("owner"),
        subscriptionTier: "professional",
        features: DEFAULT_FEATURES,
        region: "us",
        country: "US",
        defaultCurrency: "USD",
        sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
        sessionGraceMinutes: DEFAULT_SESSION_GRACE_MINUTES,
      });
      setIsLoading(false);
      return;
    }

    const backend = getBackend();

    backend.auth.getSession().then((result) => {
      if (result) {
        setSession(result.session);
        setUser(result.user);
        fetchTenantContext(result.user.id);
      }
      setIsLoading(false);
    });

    const sub = backend.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_IN" && s?.user) {
        await fetchTenantContext(s.user.id);
      } else if (event === "SIGNED_OUT") {
        setTenant(null);
        setTenantRecord(null);
        setTenantUser(null);
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [fetchTenantContext]);

  // --- Auth actions ---
  const signIn = useCallback(async (email: string, password: string) => {
    const backend = getBackend();
    const result = await backend.auth.signInWithPassword(email, password);
    return { error: result.error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, tenantName?: string) => {
    const backend = getBackend();
    const result = await backend.auth.signUp(email, password);
    if (result.error || !result.user) return { error: result.error || new Error("Sign up failed") };
    const tenantResult = await backend.auth.createTenant(result.user.id, email, tenantName);
    return tenantResult;
  }, []);

  const signOut = useCallback(async () => {
    const backend = getBackend();
    try {
      await backend.auth.signOut();
    } finally {
      // Always clear local state — even if the backend call fails,
      // the user intended to sign out and we should not leave stale state.
      setTenant(null);
      setTenantRecord(null);
      setTenantUser(null);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const backend = getBackend();
    return backend.auth.resetPassword(email);
  }, []);

  // --- Permission helpers ---
  const hasPermission = useCallback(
    (p: TenantPermission) => !!tenant && tenant.permissions.includes(p),
    [tenant],
  );
  const hasAnyPermission = useCallback(
    (ps: TenantPermission[]) => !!tenant && ps.some((p) => tenant.permissions.includes(p)),
    [tenant],
  );
  const hasAllPermissions = useCallback(
    (ps: TenantPermission[]) => !!tenant && ps.every((p) => tenant.permissions.includes(p)),
    [tenant],
  );
  const isOwnerOrAdmin = useCallback(
    () => !!tenant && (tenant.userRole === "owner" || tenant.userRole === "admin"),
    [tenant],
  );
  const refreshTenant = useCallback(async () => {
    if (user) await fetchTenantContext(user.id);
  }, [user, fetchTenantContext]);

  // --- Memoize context values to prevent unnecessary re-renders ---
  const authValue = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, session, isLoading, signIn, signUp, signOut, resetPassword],
  );

  const tenantValue = useMemo<TenantContextValue>(
    () => ({
      tenant,
      tenantRecord,
      tenantUser,
      tenantLoading,
      tenantError,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isOwnerOrAdmin,
      refreshTenant,
    }),
    [
      tenant,
      tenantRecord,
      tenantUser,
      tenantLoading,
      tenantError,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isOwnerOrAdmin,
      refreshTenant,
    ],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <TenantStateContext.Provider value={tenantValue}>
        {children}
        {user && <IdleTimeoutBridge tenant={tenant} />}
      </TenantStateContext.Provider>
    </AuthContext.Provider>
  );
}

// =============================================================================
// IDLE TIMEOUT BRIDGE — uses the hook and renders the warning dialog
// =============================================================================

function IdleTimeoutBridge({ tenant }: { tenant: TenantContextType | null }) {
  const timeoutMinutes = tenant?.sessionTimeoutMinutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES;
  const graceMinutes = tenant?.sessionGraceMinutes ?? DEFAULT_SESSION_GRACE_MINUTES;
  const { showWarning, remainingSeconds, dismiss } = useIdleTimeout({
    timeoutMinutes,
    graceMinutes,
  });

  if (!showWarning) return null;

  return <IdleTimeoutWarning remainingSeconds={remainingSeconds} onDismiss={dismiss} />;
}

// =============================================================================
// HOOKS — backward-compatible public API
// =============================================================================

function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

function useTenantContext() {
  const context = useContext(TenantStateContext);
  if (context === undefined) throw new Error("useTenantState must be used within an AuthProvider");
  return context;
}

/**
 * Combined hook — returns both auth and tenant state.
 * Consumers that only need auth should use useAuthOnly() to avoid tenant re-renders.
 */
export function useAuth() {
  const auth = useAuthContext();
  const tenantCtx = useTenantContext();
  return { ...auth, ...tenantCtx };
}

/**
 * Auth-only hook — does NOT subscribe to tenant state changes.
 * Use this in components that only need user/session/signIn/signOut.
 */
export function useAuthOnly() {
  return useAuthContext();
}

/**
 * Tenant-only hook — does NOT subscribe to auth state changes.
 * Use in components that only need tenant/features/permissions.
 */
export function useTenantState() {
  return useTenantContext();
}

export function useTenant(): TenantContextType {
  const auth = useAuthContext();
  const { tenant, tenantError } = useTenantContext();
  if (!auth.isAuthenticated) throw new Error("useTenant requires authentication");
  if (!tenant) throw new Error(tenantError || "No tenant context available");
  return tenant;
}

export function useTenantOrNull(): TenantContextType | null {
  const { tenant } = useTenantContext();
  return tenant;
}
