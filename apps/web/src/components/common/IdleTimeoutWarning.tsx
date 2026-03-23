/**
 * IdleTimeoutWarning — Modal dialog shown when the session is about to expire.
 *
 * Displayed by the AuthProvider when the idle timeout grace period starts.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface IdleTimeoutWarningProps {
  remainingSeconds: number;
  onDismiss: () => void;
}

export function IdleTimeoutWarning({ remainingSeconds, onDismiss }: IdleTimeoutWarningProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay =
    minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`;

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in <strong>{timeDisplay}</strong> due to inactivity. Click
            below to continue your session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onDismiss}>Continue Session</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
