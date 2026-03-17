import { cn } from "@/lib/utils";

interface MetricCellProps {
  label: string;
  value: React.ReactNode;
  /** Optional Tailwind text color class for the value */
  valueClassName?: string;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Reusable metric cell for dashboard grids and owner/property cards.
 * Provides consistent layout for label + value pairs.
 */
export function MetricCell({ label, value, valueClassName, size = "sm" }: MetricCellProps) {
  return (
    <div className={cn(
      "text-center rounded-lg bg-muted/50",
      size === "sm" ? "p-2" : "p-3"
    )}>
      <div className={cn(
        "font-bold font-mono text-foreground",
        size === "sm" ? "text-sm" : "text-lg",
        valueClassName
      )}>
        {value}
      </div>
      <div className={cn(
        "text-muted-foreground",
        size === "sm" ? "text-[10px]" : "text-xs"
      )}>
        {label}
      </div>
    </div>
  );
}
