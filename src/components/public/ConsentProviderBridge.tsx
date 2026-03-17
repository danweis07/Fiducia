import { useEffect, useCallback, useRef } from "react";
import { useCookieConsent } from "./CookieConsent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Supported third-party consent management platforms.
 * - `built-in`  — Custom React-based cookie banner (default)
 * - `ketch`     — Ketch Privacy Orchestration (API-first, developer-friendly)
 * - `osano`     — Osano Consent Manager (simple setup, open-source friendly)
 * - `onetrust`  — OneTrust CookieConsent (enterprise-grade, widely recognized)
 */
export type ConsentProviderType = "built-in" | "ketch" | "osano" | "onetrust";

export interface ConsentProviderConfig {
  provider: ConsentProviderType;
  /** Ketch: Organization code (e.g. "your_org") */
  ketchOrgCode?: string;
  /** Ketch: Property code (e.g. "your_property") */
  ketchPropertyCode?: string;
  /** Osano: Customer ID from the Osano script URL */
  osanoCustomerId?: string;
  /** Osano: Config ID (the second segment of the Osano embed URL) */
  osanoConfigId?: string;
  /** OneTrust: Domain script ID (UUID from the OneTrust portal) */
  oneTrustDomainScript?: string;
  /** OneTrust: Enable auto-blocking of scripts (default: true) */
  oneTrustAutoBlock?: boolean;
}

// ---------------------------------------------------------------------------
// Environment-based default config
// ---------------------------------------------------------------------------

const ENV_PROVIDER = (import.meta.env.VITE_CONSENT_PROVIDER ?? "built-in") as ConsentProviderType;

export function getDefaultConsentConfig(): ConsentProviderConfig {
  return {
    provider: ENV_PROVIDER,
    ketchOrgCode: import.meta.env.VITE_KETCH_ORG_CODE ?? "",
    ketchPropertyCode: import.meta.env.VITE_KETCH_PROPERTY_CODE ?? "",
    osanoCustomerId: import.meta.env.VITE_OSANO_CUSTOMER_ID ?? "",
    osanoConfigId: import.meta.env.VITE_OSANO_CONFIG_ID ?? "",
    oneTrustDomainScript: import.meta.env.VITE_ONETRUST_DOMAIN_SCRIPT ?? "",
    oneTrustAutoBlock: import.meta.env.VITE_ONETRUST_AUTO_BLOCK !== "false",
  };
}

// ---------------------------------------------------------------------------
// Script injection helpers
// ---------------------------------------------------------------------------

const PROVIDER_ATTR = "data-consent-provider";

function injectProviderScript(id: string, src: string, attrs?: Record<string, string>): void {
  if (document.querySelector(`script[${PROVIDER_ATTR}="${id}"]`)) return;
  const el = document.createElement("script");
  el.async = true;
  el.src = src;
  el.setAttribute(PROVIDER_ATTR, id);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  }
  document.head.appendChild(el);
}

function removeProviderScripts(): void {
  document.querySelectorAll(`script[${PROVIDER_ATTR}]`).forEach((el) => el.remove());
}

// ---------------------------------------------------------------------------
// Window type extensions for third-party SDKs
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    // Ketch
    ketch?: (action: string, ...args: unknown[]) => void;
    semaphore?: unknown[];
    // Osano
    Osano?: {
      cm: {
        addEventListener: (event: string, cb: (consent: Record<string, string>) => void) => void;
        mode: string;
      };
    };
    // OneTrust
    OneTrust?: {
      OnConsentChanged: (cb: (e: { detail: unknown[] }) => void) => void;
      GetDomainData: () => { Groups: Array<{ CustomGroupId: string; Status: string }> };
    };
    OptanonWrapper?: () => void;
    OnetrustActiveGroups?: string;
  }
}

// ---------------------------------------------------------------------------
// Provider-specific consent mapping
// ---------------------------------------------------------------------------

/**
 * Maps third-party consent categories to our internal `analytics` / `marketing`
 * booleans so the existing `AdTrackers` component works seamlessly.
 */

function mapKetchConsent(purposes: Record<string, boolean>): {
  analytics: boolean;
  marketing: boolean;
} {
  // Ketch uses purpose codes configured in the dashboard.
  // Common conventions: "analytics", "advertising" / "marketing", "personalization"
  return {
    analytics: !!purposes["analytics"] || !!purposes["performance"],
    marketing: !!purposes["advertising"] || !!purposes["marketing"],
  };
}

function mapOsanoConsent(consent: Record<string, string>): {
  analytics: boolean;
  marketing: boolean;
} {
  // Osano categories: ESSENTIAL, ANALYTICS, MARKETING, PERSONALIZATION, OPT_OUT
  // Values: "ACCEPT" | "DENY"
  return {
    analytics: consent["ANALYTICS"] === "ACCEPT",
    marketing: consent["MARKETING"] === "ACCEPT",
  };
}

function mapOneTrustConsent(activeGroups: string): { analytics: boolean; marketing: boolean } {
  // OneTrust group IDs (IAB standard):
  // C0001 = Strictly Necessary, C0002 = Performance/Analytics,
  // C0003 = Functional, C0004 = Targeting/Marketing
  return {
    analytics: activeGroups.includes("C0002"),
    marketing: activeGroups.includes("C0004"),
  };
}

// ---------------------------------------------------------------------------
// Bridge Component
// ---------------------------------------------------------------------------

export interface ConsentProviderBridgeProps {
  config?: ConsentProviderConfig;
}

/**
 * Loads a third-party consent SDK and bridges its consent signals into the
 * existing `CookieConsentContext`. When `provider` is `"built-in"`, this
 * component renders nothing and the custom banner handles everything.
 *
 * Place inside `<CookieConsentProvider>` — it reads/writes consent state
 * through the `useCookieConsent` hook.
 */
export function ConsentProviderBridge({ config }: ConsentProviderBridgeProps) {
  const resolvedConfig = config ?? getDefaultConsentConfig();
  const { provider } = resolvedConfig;
  const { updateConsent } = useCookieConsent();
  const initialized = useRef(false);

  // Stable reference for the consent updater
  const updateRef = useRef(updateConsent);
  updateRef.current = updateConsent;

  // --- Ketch ---
  const initKetch = useCallback(() => {
    const { ketchOrgCode, ketchPropertyCode } = resolvedConfig;
    if (!ketchOrgCode || !ketchPropertyCode) {
      return;
    }

    // Ketch "semaphore" queue pattern
    window.semaphore = window.semaphore || [];
    window.semaphore.push([
      "consent",
      "onUpdate",
      (purposes: Record<string, boolean>) => {
        const mapped = mapKetchConsent(purposes);
        updateRef.current(mapped);
      },
    ]);

    injectProviderScript(
      "ketch",
      `https://global.ketchcdn.com/web/v3/config/${ketchOrgCode}/${ketchPropertyCode}/boot.js`,
      { "data-cfasync": "false" },
    );
  }, [resolvedConfig]);

  // --- Osano ---
  const initOsano = useCallback(() => {
    const { osanoCustomerId, osanoConfigId } = resolvedConfig;
    if (!osanoCustomerId || !osanoConfigId) {
      return;
    }

    // Osano fires a consent change event once loaded
    const onOsanoReady = () => {
      if (window.Osano?.cm) {
        window.Osano.cm.addEventListener(
          "osano-cm-consent-saved",
          (consent: Record<string, string>) => {
            const mapped = mapOsanoConsent(consent);
            updateRef.current(mapped);
          },
        );
        window.Osano.cm.addEventListener(
          "osano-cm-initialized",
          (consent: Record<string, string>) => {
            const mapped = mapOsanoConsent(consent);
            updateRef.current(mapped);
          },
        );
      }
    };

    injectProviderScript(
      "osano",
      `https://cmp.osano.com/${osanoCustomerId}/${osanoConfigId}/osano.js`,
    );

    // Poll briefly for Osano to load (it doesn't have a reliable callback hook
    // before the script tag finishes loading)
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if (window.Osano?.cm) {
        clearInterval(poll);
        onOsanoReady();
      }
      if (attempts > 50) clearInterval(poll); // Give up after ~5s
    }, 100);
  }, [resolvedConfig]);

  // --- OneTrust ---
  const initOneTrust = useCallback(() => {
    const { oneTrustDomainScript, oneTrustAutoBlock } = resolvedConfig;
    if (!oneTrustDomainScript) {
      return;
    }

    // OneTrust calls `OptanonWrapper` after consent is loaded/updated
    window.OptanonWrapper = () => {
      const groups = window.OnetrustActiveGroups ?? "";
      const mapped = mapOneTrustConsent(groups);
      updateRef.current(mapped);
    };

    // Auto-blocking script (optional but recommended)
    if (oneTrustAutoBlock !== false) {
      injectProviderScript(
        "onetrust-blocking",
        `https://cdn.cookielaw.org/consent/${oneTrustDomainScript}/OtAutoBlock.js`,
      );
    }

    injectProviderScript("onetrust", "https://cdn.cookielaw.org/scripttemplates/otSDKStub.js", {
      "data-domain-script": oneTrustDomainScript,
      charset: "UTF-8",
    });
  }, [resolvedConfig]);

  // --- Main effect ---
  useEffect(() => {
    if (provider === "built-in" || initialized.current) return;
    initialized.current = true;

    switch (provider) {
      case "ketch":
        initKetch();
        break;
      case "osano":
        initOsano();
        break;
      case "onetrust":
        initOneTrust();
        break;
    }

    return () => {
      removeProviderScripts();
      initialized.current = false;
    };
  }, [provider, initKetch, initOsano, initOneTrust]);

  // This component is invisible — all it does is load scripts & bridge events.
  return null;
}

export default ConsentProviderBridge;
