import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, parseToCents } from "@/lib/common/currency";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Show formatted preview below */
  showPreview?: boolean;
  /** Hint text below the input */
  hint?: string;
  /** Error message */
  error?: string;
  /** Max amount in cents */
  maxCents?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function AmountInput({
  id = "amount-input",
  label,
  value,
  onChange,
  showPreview = true,
  hint,
  error,
  maxCents,
  className,
  placeholder = "0.00",
  disabled = false,
}: AmountInputProps) {
  const [touched, setTouched] = useState(false);
  const cents = parseToCents(value);
  const exceedsMax = maxCents !== undefined && cents > maxCents;
  const hasError = !!error || (touched && exceedsMax);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <DollarSign
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          className={cn("pl-8", hasError && "border-destructive")}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      </div>
      {showPreview && cents > 0 && !hasError && (
        <p className="text-sm text-muted-foreground">{formatCurrency(cents)}</p>
      )}
      {exceedsMax && touched && !error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          Amount exceeds maximum of {formatCurrency(maxCents!)}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {hint && !hasError && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
