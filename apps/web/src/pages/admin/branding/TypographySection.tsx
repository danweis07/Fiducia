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
import type { TypographyTokens, FontWeight } from "@/types/admin";
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

const WEIGHT_OPTIONS: { value: FontWeight; label: string }[] = [
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi-Bold (600)" },
  { value: "700", label: "Bold (700)" },
  { value: "800", label: "Extra-Bold (800)" },
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

        {/* Font Weights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Heading Weight</Label>
            <Select
              value={typography.headingWeight}
              onValueChange={(v) => update({ headingWeight: v as FontWeight })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    <span style={{ fontWeight: Number(w.value) }}>{w.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Body Weight</Label>
            <Select
              value={typography.bodyWeight}
              onValueChange={(v) => update({ bodyWeight: v as FontWeight })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    <span style={{ fontWeight: Number(w.value) }}>{w.label}</span>
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
            className="text-lg"
            style={{
              fontFamily: `'${typography.headingFont}', sans-serif`,
              fontWeight: Number(typography.headingWeight),
            }}
          >
            Heading Preview — {typography.headingFont} ({typography.headingWeight})
          </p>
          <p
            className="text-sm"
            style={{
              fontFamily: `'${typography.bodyFont}', sans-serif`,
              fontWeight: Number(typography.bodyWeight),
            }}
          >
            Body text preview — {typography.bodyFont} ({typography.bodyWeight}). The quick brown fox
            jumps over the lazy dog.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
