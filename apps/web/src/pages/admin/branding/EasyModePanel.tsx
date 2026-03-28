/**
 * EasyModePanel — Preset selector + primary/accent color override + logo upload
 *
 * This is the simplified interface for institutions that just want to pick
 * a theme, set their brand color, upload a logo, and go.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { DesignSystemConfig } from "@/types/admin";
import { DESIGN_PRESETS, PRESET_LABELS, PRESET_DESCRIPTIONS } from "@/lib/theme/presets";
import { deriveFullPalette } from "@/lib/theme/color-derivation";
import { hslToHex, hexToHsl } from "@/lib/theme/color-utils";
import { ColorPickerField } from "./ColorPickerField";

interface EasyModePanelProps {
  config: DesignSystemConfig;
  onChange: (config: DesignSystemConfig) => void;
}

export function EasyModePanel({ config, onChange }: EasyModePanelProps) {
  const selectedPreset = config.presetId ?? "classic";

  function selectPreset(presetId: string) {
    const preset = DESIGN_PRESETS[presetId];
    if (preset) {
      onChange({ ...preset, logos: config.logos });
    }
  }

  function updatePrimaryColor(hsl: string) {
    const primaryHex = hslToHex(hsl);
    const accentHex = hslToHex(config.colors.light.accent.base);
    const { light, dark } = deriveFullPalette(primaryHex, accentHex);
    onChange({
      ...config,
      colors: { light, dark },
    });
  }

  function updateAccentColor(hsl: string) {
    const primaryHex = hslToHex(config.colors.light.primary.base);
    const accentHex = hslToHex(hsl);
    const { light, dark } = deriveFullPalette(primaryHex, accentHex);
    onChange({
      ...config,
      colors: { light, dark },
    });
  }

  function updateLogoUrl(url: string | null) {
    onChange({
      ...config,
      logos: { ...config.logos, primary: url || null },
    });
  }

  return (
    <div className="space-y-4">
      {/* Preset Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Choose a Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(PRESET_LABELS).map(([id, label]) => {
              const preset = DESIGN_PRESETS[id];
              const isSelected = selectedPreset === id;
              const primaryHex = hslToHex(preset.colors.light.primary.base);
              const accentHex = hslToHex(preset.colors.light.accent.base);

              return (
                <button
                  key={id}
                  onClick={() => selectPreset(id)}
                  className={`relative text-left border-2 rounded-lg p-4 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {/* Color swatches */}
                  <div className="flex gap-1.5 mb-3">
                    <div
                      className="h-8 w-8 rounded-md border"
                      style={{ backgroundColor: primaryHex }}
                    />
                    <div
                      className="h-8 w-8 rounded-md border"
                      style={{ backgroundColor: accentHex }}
                    />
                    <div className="h-8 w-8 rounded-md border bg-muted" />
                  </div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{PRESET_DESCRIPTIONS[id]}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Brand Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ColorPickerField
            id="easy-primary"
            label="Primary Color"
            value={config.colors.light.primary.base}
            onChange={updatePrimaryColor}
          />
          <ColorPickerField
            id="easy-accent"
            label="Accent Color"
            value={config.colors.light.accent.base}
            onChange={updateAccentColor}
          />
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          {config.logos.primary ? (
            <div className="border rounded-lg p-6 text-center space-y-3">
              <img
                src={config.logos.primary}
                alt="Logo"
                className="max-h-16 mx-auto object-contain"
              />
              <Button variant="outline" size="sm" onClick={() => updateLogoUrl(null)}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Upload your institution&apos;s logo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  SVG or PNG recommended. Min 400px wide.
                </p>
              </div>
              <Input
                placeholder="Or enter logo URL..."
                onChange={(e) => updateLogoUrl(e.target.value)}
                className="text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
