import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cookie, Settings, Shield } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsentState {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

interface CookieConsentContextValue {
  analytics: boolean;
  marketing: boolean;
  showBanner: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  updateConsent: (updates: { analytics?: boolean; marketing?: boolean }) => void;
  /** Re-open the consent banner so the user can change preferences. */
  openBanner: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "app-cookie-consent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

/**
 * Hook that exposes the current cookie-consent state and mutation helpers.
 * Must be used inside `<CookieConsentProvider>`.
 */
export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within a <CookieConsentProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(() => {
    const stored = readStoredConsent();
    return stored ?? { essential: true, analytics: false, marketing: false, timestamp: "" };
  });
  const [showBanner, setShowBanner] = useState<boolean>(() => readStoredConsent() === null);

  const persist = useCallback((next: ConsentState) => {
    const stamped: ConsentState = { ...next, timestamp: new Date().toISOString() };
    setConsent(stamped);
    writeConsent(stamped);
    setShowBanner(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ essential: true, analytics: true, marketing: true, timestamp: "" });
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist({ essential: true, analytics: false, marketing: false, timestamp: "" });
  }, [persist]);

  const updateConsent = useCallback(
    (updates: { analytics?: boolean; marketing?: boolean }) => {
      persist({
        essential: true,
        analytics: updates.analytics ?? consent.analytics,
        marketing: updates.marketing ?? consent.marketing,
        timestamp: "",
      });
    },
    [persist, consent],
  );

  const openBanner = useCallback(() => {
    setShowBanner(true);
  }, []);

  const value: CookieConsentContextValue = {
    analytics: consent.analytics,
    marketing: consent.marketing,
    showBanner,
    acceptAll,
    rejectNonEssential,
    updateConsent,
    openBanner,
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

// ---------------------------------------------------------------------------
// Banner Component
// ---------------------------------------------------------------------------

type BannerMode = "simple" | "detailed";

export function CookieConsent() {
  const { analytics, marketing, showBanner, acceptAll, rejectNonEssential, updateConsent } =
    useCookieConsent();

  const [mode, setMode] = useState<BannerMode>("simple");
  const [localAnalytics, setLocalAnalytics] = useState(analytics);
  const [localMarketing, setLocalMarketing] = useState(marketing);
  const [visible, setVisible] = useState(false);

  // Animate in when banner becomes visible
  useEffect(() => {
    if (showBanner) {
      // Small delay so the CSS transition triggers the slide-up
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
    setMode("simple");
  }, [showBanner]);

  // Sync local toggles when context values change (e.g. re-open after prior save)
  useEffect(() => {
    setLocalAnalytics(analytics);
    setLocalMarketing(marketing);
  }, [analytics, marketing]);

  if (!showBanner) return null;

  const handleSavePreferences = () => {
    updateConsent({ analytics: localAnalytics, marketing: localMarketing });
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center p-4 transition-transform duration-500 ease-out"
      style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
    >
      <Card className="w-full max-w-2xl shadow-2xl border bg-background">
        <CardContent className="p-6 space-y-4">
          {/* ---- Header ---- */}
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold leading-tight">Cookie Preferences</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We use cookies to improve your experience, analyse traffic, and personalise content.
                Read our{" "}
                <Link to="/p/privacy" className="underline text-primary hover:text-primary/80">
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>
            </div>
          </div>

          {/* ---- Simple mode buttons ---- */}
          {mode === "simple" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={acceptAll} size="sm">
                Accept All
              </Button>
              <Button onClick={rejectNonEssential} variant="outline" size="sm">
                Reject Non-Essential
              </Button>
              <Button
                onClick={() => setMode("detailed")}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <Settings className="h-4 w-4" />
                Manage Preferences
              </Button>
            </div>
          )}

          {/* ---- Detailed mode ---- */}
          {mode === "detailed" && (
            <div className="space-y-4">
              {/* Essential */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Essential</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Always on
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Required for core functionality such as authentication and security.
                  </p>
                </div>
                <Switch checked disabled aria-label="Essential cookies (always enabled)" />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Analytics</span>
                    <Badge variant="outline" className="text-[10px]">
                      Optional
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Help us understand how visitors interact with the site (e.g. Google Analytics).
                  </p>
                </div>
                <Switch
                  checked={localAnalytics}
                  onCheckedChange={setLocalAnalytics}
                  aria-label="Analytics cookies"
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Marketing</span>
                    <Badge variant="outline" className="text-[10px]">
                      Optional
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used for ad targeting, retargeting, and conversion measurement.
                  </p>
                </div>
                <Switch
                  checked={localMarketing}
                  onCheckedChange={setLocalMarketing}
                  aria-label="Marketing cookies"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSavePreferences} size="sm">
                  Save Preferences
                </Button>
                <Button onClick={acceptAll} variant="outline" size="sm">
                  Accept All
                </Button>
                <Button onClick={() => setMode("simple")} variant="ghost" size="sm">
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CookieConsent;
