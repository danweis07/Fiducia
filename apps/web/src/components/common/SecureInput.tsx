import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SecureInputProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type"
> {
  value: string;
  onChange: (value: string) => void;
  maskChar?: string;
  label?: string;
}

export function SecureInput({
  value,
  onChange,
  maskChar = "\u2022",
  label,
  className,
  id,
  ...rest
}: SecureInputProps) {
  const [revealed, setRevealed] = useState(false);

  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const displayValue = revealed ? value : maskChar.repeat(value.length);

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div className="relative">
        <Input
          id={inputId}
          className={cn("pr-10", className)}
          value={displayValue}
          onChange={(e) => {
            if (revealed) {
              onChange(e.target.value);
            } else {
              // When masked, handle typing by appending new chars / trimming
              const newLen = e.target.value.length;
              if (newLen > value.length) {
                // Characters were added — extract the non-mask chars from the end
                const added = e.target.value.slice(value.length);
                onChange(value + added);
              } else {
                // Characters were removed
                onChange(value.slice(0, newLen));
              }
            }
          }}
          {...rest}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
          onClick={() => setRevealed((prev) => !prev)}
          aria-label={revealed ? "Hide value" : "Show value"}
        >
          {revealed ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}
