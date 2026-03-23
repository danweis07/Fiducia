import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * OfflineBanner — shows a persistent banner when the browser goes offline.
 * Place at the top of the app layout.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}
