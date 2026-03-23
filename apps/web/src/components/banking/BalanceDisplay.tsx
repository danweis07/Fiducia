/**
 * BalanceDisplay — Formatted balance with currency, used across multiple pages.
 */

import { formatCurrency, formatCurrencyCompact } from "@/lib/common/currency";
import { cn } from "@/lib/utils";

interface BalanceDisplayProps {
  cents: number;
  /** Use compact notation for large amounts (e.g., $12.5K) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Label shown above the balance */
  label?: string;
  /** Currency code override (defaults to tenant currency) */
  currency?: string;
}

export function BalanceDisplay({
  cents,
  compact,
  className,
  label,
  currency,
}: BalanceDisplayProps) {
  const formatted = compact
    ? formatCurrencyCompact(cents, undefined, currency)
    : formatCurrency(cents, undefined, currency);

  return (
    <div className={cn("", className)}>
      {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
      <p className={cn("font-bold", label ? "text-2xl" : "text-xl")}>{formatted}</p>
    </div>
  );
}
