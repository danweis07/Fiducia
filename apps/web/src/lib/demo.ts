// =============================================================================
// DEMO MODE — Bypasses auth for demonstration purposes
// =============================================================================

const DEMO_SESSION_KEY = "demo";

/**
 * Check if the app is running in demo mode.
 * Activated by ?demo=true query param, VITE_DEMO_MODE env var,
 * or sessionStorage (persists across navigation within the same tab).
 */
export function isDemoMode(): boolean {
  // Check env var
  if (import.meta.env.VITE_DEMO_MODE === "true") return true;

  if (typeof window !== "undefined") {
    // Check query param — also persist to sessionStorage
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      sessionStorage.setItem(DEMO_SESSION_KEY, "true");
      return true;
    }

    // Check sessionStorage (survives in-app navigation)
    if (sessionStorage.getItem(DEMO_SESSION_KEY) === "true") return true;
  }

  return false;
}

/** Activate demo mode and navigate to a target path (defaults to dashboard) */
export function activateDemoMode(targetPath: string = "/dashboard"): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(DEMO_SESSION_KEY, "true");
    const separator = targetPath.includes("?") ? "&" : "?";
    window.location.href = `${targetPath}${separator}demo=true`;
  }
}

/** Deactivate demo mode and clear session state */
export function deactivateDemoMode(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  }
}

/** A synthetic user object for demo mode */
export const DEMO_USER = {
  id: "demo-user-001",
  email: "demo@example.com",
  displayName: "Demo User",
} as const;
