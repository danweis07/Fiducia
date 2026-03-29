/**
 * ColorPickerField — Reusable color picker with hex input and HSL readout
 *
 * Accepts and emits HSL strings (the format used by CSS variables).
 * Displays a native color picker (which uses hex) with automatic conversion.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hexToHsl, hslToHex } from "@/lib/theme/color-utils";

interface ColorPickerFieldProps {
  label: string;
  value: string; // HSL string "H S% L%"
  onChange: (hsl: string) => void;
  id?: string;
}

export function ColorPickerField({ label, value, onChange, id }: ColorPickerFieldProps) {
  const hex = safeHslToHex(value);

  function handleHexChange(newHex: string) {
    const cleaned = newHex.startsWith("#") ? newHex : `#${newHex}`;
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange(hexToHsl(cleaned));
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          id={id}
          value={hex}
          onChange={(e) => handleHexChange(e.target.value)}
          className="h-9 w-12 rounded border cursor-pointer flex-shrink-0"
        />
        <Input
          value={hex}
          onChange={(e) => handleHexChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
        />
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap hidden sm:inline">
          {value}
        </span>
      </div>
    </div>
  );
}

function safeHslToHex(hsl: string): string {
  try {
    return hslToHex(hsl);
  } catch {
    return "#000000";
  }
}
