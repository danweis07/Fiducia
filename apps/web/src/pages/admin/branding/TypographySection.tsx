/**
 * TypographySection — Heading font, body font, and font scale controls
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TypographyTokens } from "@/types/admin";
import { AVAILABLE_FONTS } from "@/lib/theme";

interface TypographySectionProps {
  typography: TypographyTokens;
  onChange: (typography: TypographyTokens) => void;
}

const SCALE_OPTIONS: {
  value: TypographyTokens["fontScale"];
  label: string;
  description: string;
}[] = [
  { value: "compact", label: "Compact", description: "Smaller text, denser layout" },
  { value: "default", label: "Default", description: "Standard sizing" },
  { value: "spacious", label: "Spacious", description: "Larger text, more breathing room" },
];

export function TypographySection({ typography, onChange }: TypographySectionProps) {
  const update = (partial: Partial<TypographyTokens>) => {
    onChange({ ...typography, ...partial });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Typography</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Heading Font</Label>
            <Select
              value={typography.headingFont}
              onValueChange={(v) => update({ headingFont: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_FONTS.map((f) => (
                  <SelectItem key={f} value={f}>
                    <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Body Font</Label>
            <Select value={typography.bodyFont} onValueChange={(v) => update({ bodyFont: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_FONTS.map((f) => (
                  <SelectItem key={f} value={f}>
                    <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Font Scale</Label>
          <div className="grid grid-cols-3 gap-2">
            {SCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ fontScale: opt.value })}
                className={`text-left border rounded-lg p-3 transition-colors ${
                  typography.fontScale === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="border rounded-lg p-4 space-y-2">
          <p
            className="text-lg font-bold"
            style={{ fontFamily: `'${typography.headingFont}', sans-serif` }}
          >
            Heading Preview — {typography.headingFont}
          </p>
          <p className="text-sm" style={{ fontFamily: `'${typography.bodyFont}', sans-serif` }}>
            Body text preview — {typography.bodyFont}. The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
