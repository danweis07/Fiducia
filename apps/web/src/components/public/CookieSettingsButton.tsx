import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "./CookieConsent";

/**
 * A small floating button pinned to the bottom-left corner of the viewport.
 * It appears only after the consent banner has been dismissed (i.e. the user
 * has already made a choice) and lets them re-open the cookie-preferences
 * dialog at any time.
 */
export function CookieSettingsButton() {
  const { showBanner, openBanner } = useCookieConsent();

  // Don't show while the banner is already visible.
  if (showBanner) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={openBanner}
      aria-label="Cookie settings"
      className="fixed bottom-4 left-4 z-[9999] h-10 w-10 rounded-full shadow-lg bg-background hover:bg-accent"
    >
      <Cookie className="h-5 w-5" />
    </Button>
  );
}

export default CookieSettingsButton;
