import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "app_banner_dismissed";

/**
 * Smart App Banner — shown on mobile web to encourage native app download.
 * Dismissible with localStorage persistence. Only renders on mobile viewports.
 */
export function MobileAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile-ish screens and if not previously dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    const isMobile = window.innerWidth < 768;
    if (isMobile && !dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!visible) return null;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const storeLabel = isIOS ? "App Store" : "Google Play";
  const storeUrl = isIOS
    ? "https://apps.apple.com/app/example-mobile-banking/id0000000000"
    : "https://play.google.com/store/apps/details?id=org.example.mobile.banking";

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-slate-900 text-white safe-area-top animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3 px-4 py-3 max-w-7xl mx-auto">
        {/* App icon */}
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Mobile Banking</p>
          <p className="text-xs text-slate-300 truncate">
            Bank on the go — free on the {storeLabel}
          </p>
        </div>

        {/* CTA */}
        <a href={storeUrl} target="_blank" rel="noopener noreferrer">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 shrink-0"
          >
            Open
          </Button>
        </a>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="shrink-0 p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Dismiss app banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
