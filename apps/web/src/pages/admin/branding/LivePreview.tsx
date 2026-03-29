/**
 * LivePreview — Shows a live preview of the design system applied to a mock UI
 *
 * Applies colors in an isolated scoped container so the admin UI is not affected.
 */

import { useMemo } from "react";
import { Sun, Moon, Smartphone, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DesignSystemConfig, ColorPalette } from "@/types/admin";
import { deriveDarkPalette } from "@/lib/theme/color-derivation";
import { hslToHex } from "@/lib/theme/color-utils";
import { BORDER_RADIUS_VALUES } from "@/lib/theme";

interface LivePreviewProps {
  config: DesignSystemConfig;
  darkPreview: boolean;
  onToggleDark: (dark: boolean) => void;
}

function paletteToStyles(palette: ColorPalette, borderRadius: string): Record<string, string> {
  return {
    "--p-primary": palette.primary.base,
    "--p-primary-fg": palette.primary.foreground,
    "--p-secondary": palette.secondary.base,
    "--p-accent": palette.accent.base,
    "--p-accent-fg": palette.accent.foreground,
    "--p-bg": palette.background.base,
    "--p-fg": palette.background.foreground,
    "--p-card": palette.card.base,
    "--p-card-fg": palette.card.foreground,
    "--p-muted": palette.muted.base,
    "--p-muted-fg": palette.muted.foreground,
    "--p-border": palette.border,
    "--p-destructive": palette.destructive.base,
    "--p-radius": borderRadius,
    "--p-risk-low": palette.riskLow,
    "--p-risk-low-light": palette.riskLowLight,
    "--p-risk-critical": palette.riskCritical,
    "--p-risk-critical-light": palette.riskCriticalLight,
    "--p-status-success": palette.statusSuccess,
    "--p-status-warning": palette.statusWarning,
  } as Record<string, string>;
}

export function LivePreview({ config, darkPreview, onToggleDark }: LivePreviewProps) {
  const palette = useMemo(() => {
    if (darkPreview) {
      return config.colors.dark ?? deriveDarkPalette(config.colors.light);
    }
    return config.colors.light;
  }, [config, darkPreview]);

  const radiusValue = BORDER_RADIUS_VALUES[config.surfaces.borderRadius];
  const styles = paletteToStyles(palette, radiusValue);

  const primaryHex = hslToHex(palette.primary.base);
  const accentHex = hslToHex(palette.accent.base);
  const bgHex = hslToHex(palette.background.base);
  const fgHex = hslToHex(palette.background.foreground);
  const cardHex = hslToHex(palette.card.base);
  const mutedHex = hslToHex(palette.muted.base);
  const borderHex = hslToHex(palette.border);
  const primaryFgHex = hslToHex(palette.primary.foreground);
  const successHex = hslToHex(palette.statusSuccess);
  const destructiveHex = hslToHex(palette.destructive.base);

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Live Preview</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={!darkPreview ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleDark(false)}
            >
              <Sun className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={darkPreview ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleDark(true)}
            >
              <Moon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            ...styles,
            backgroundColor: bgHex,
            color: fgHex,
            fontFamily: `'${config.typography.bodyFont}', sans-serif`,
            borderRadius: radiusValue,
          }}
        >
          {/* Mock app header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: primaryHex }}
          >
            {config.logos.primary ? (
              <img src={config.logos.primary} alt="Logo" className="h-7 object-contain" />
            ) : (
              <div
                className="h-7 w-7 rounded"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              />
            )}
            <span
              className="text-sm font-semibold"
              style={{
                color: primaryFgHex,
                fontFamily: `'${config.typography.headingFont}', sans-serif`,
              }}
            >
              Your Institution
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Balance card */}
            <div
              className="p-4"
              style={{
                backgroundColor: cardHex,
                borderRadius: radiusValue,
                border: `1px solid ${borderHex}`,
              }}
            >
              <p className="text-xs" style={{ color: fgHex, opacity: 0.6 }}>
                Total Balance
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ fontFamily: `'${config.typography.headingFont}', sans-serif` }}
              >
                $18,077.73
              </p>
              <p className="text-xs mt-0.5" style={{ color: fgHex, opacity: 0.5 }}>
                Across 3 accounts
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-2">
              {["Transfer", "Pay", "Deposit", "Cards"].map((label) => (
                <div key={label} className="text-center">
                  <div
                    className="mx-auto h-10 w-10 flex items-center justify-center"
                    style={{
                      backgroundColor: accentHex + "22",
                      color: accentHex,
                      borderRadius:
                        config.surfaces.borderRadius === "full" ? "9999px" : radiusValue,
                    }}
                  >
                    <Monitor className="h-4 w-4" />
                  </div>
                  <p className="text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>

            <Separator style={{ backgroundColor: borderHex }} />

            {/* Transaction list */}
            {[
              { name: "Whole Foods", amount: "-$32.00", color: destructiveHex },
              { name: "Netflix", amount: "-$15.99", color: destructiveHex },
              { name: "Payroll", amount: "+$2,450.00", color: successHex },
            ].map((tx) => (
              <div key={tx.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full" style={{ backgroundColor: mutedHex }} />
                  <div>
                    <p className="text-sm font-medium">{tx.name}</p>
                    <p className="text-xs" style={{ opacity: 0.5 }}>
                      Mar 9
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium" style={{ color: tx.color }}>
                  {tx.amount}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom nav */}
          <div
            className="flex justify-around py-2 text-xs"
            style={{ borderTop: `1px solid ${borderHex}` }}
          >
            {["Home", "Accounts", "Transfer", "More"].map((label) => (
              <div key={label} className="text-center" style={{ opacity: 0.5 }}>
                <Smartphone className="h-4 w-4 mx-auto" />
                <p className="mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Color swatch bar */}
        <div className="mt-4 flex gap-1">
          {[
            { label: "Primary", hex: primaryHex },
            { label: "Accent", hex: accentHex },
            { label: "BG", hex: bgHex },
            { label: "Card", hex: cardHex },
            { label: "Border", hex: borderHex },
          ].map(({ label, hex }) => (
            <div key={label} className="flex-1 text-center">
              <div className="h-6 rounded-sm border" style={{ backgroundColor: hex }} />
              <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
