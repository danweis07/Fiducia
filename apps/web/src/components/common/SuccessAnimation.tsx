import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessAnimationProps {
  title: string;
  description?: string;
  details?: { label: string; value: string }[];
  className?: string;
  children?: React.ReactNode;
}

export function SuccessAnimation({
  title,
  description,
  details,
  className,
  children,
}: SuccessAnimationProps) {
  return (
    <div className={cn("text-center space-y-4 py-8", className)} role="status" aria-live="polite">
      <div className="mx-auto w-16 h-16 rounded-full bg-risk-low-light flex items-center justify-center animate-in zoom-in-50 duration-300">
        <CheckCircle2 className="h-8 w-8 text-status-success" />
      </div>
      <h2 className="text-xl font-bold animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-150">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground animate-in fade-in-0 duration-300 delay-200">
          {description}
        </p>
      )}
      {details && details.length > 0 && (
        <div className="space-y-1 animate-in fade-in-0 duration-300 delay-250">
          {details.map((d) => (
            <p key={d.label} className="text-sm text-muted-foreground">
              {d.label}: {d.value}
            </p>
          ))}
        </div>
      )}
      {children && <div className="animate-in fade-in-0 duration-300 delay-300">{children}</div>}
    </div>
  );
}
