import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusStyle } from "@/lib/common/design-tokens";

export interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const style = getStatusStyle(normalizedStatus);

  return (
    <Badge variant="outline" className={cn(style.badge, "capitalize", className)}>
      {label ?? normalizedStatus}
    </Badge>
  );
}
