/**
 * AdvancedModePanel — Full token-level control over the design system
 *
 * Accordion sections for every token category.
 */

import type { DesignSystemConfig, ColorPalette, ColorPair } from "@/types/admin";
import { ColorPaletteSection } from "./ColorPaletteSection";
import { LogoSection } from "./LogoSection";
import { TypographySection } from "./TypographySection";
import { SurfacesSection } from "./SurfacesSection";
import { GradientSection } from "./GradientSection";
import { ChannelOverridesSection } from "./ChannelOverridesSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface AdvancedModePanelProps {
  config: DesignSystemConfig;
  onChange: (config: DesignSystemConfig) => void;
}

// Helper to update a nested color in the light palette
function updateLightColor(
  config: DesignSystemConfig,
  path: string,
  value: string,
): DesignSystemConfig {
  const light = { ...config.colors.light };

  // Handle ColorPair fields (e.g., "primary.base", "primary.foreground")
  if (path.includes(".")) {
    const [group, prop] = path.split(".");
    const groupKey = group as keyof ColorPalette;
    const current = light[groupKey];
    if (typeof current === "object" && current !== null && "base" in current) {
      (light as Record<string, ColorPair>)[group] = {
        ...(current as ColorPair),
        [prop]: value,
      };
    } else if (typeof current === "object" && current !== null) {
      // Sidebar nested object
      (light as Record<string, Record<string, string>>)[group] = {
        ...(current as Record<string, string>),
        [prop]: value,
      };
    }
  } else {
    // Direct string fields (border, input, ring, risk*, status*, slate*, gold*)
    (light as Record<string, unknown>)[path] = value;
  }

  return {
    ...config,
    colors: { ...config.colors, light },
  };
}

export function AdvancedModePanel({ config, onChange }: AdvancedModePanelProps) {
  const light = config.colors.light;
  const hasDarkOverride = config.colors.dark !== null;

  function handleColorChange(path: string, value: string) {
    onChange(updateLightColor(config, path, value));
  }

  return (
    <div className="space-y-4">
      {/* Logos */}
      <LogoSection logos={config.logos} onChange={(logos) => onChange({ ...config, logos })} />

      {/* Brand Colors */}
      <ColorPaletteSection
        title="Brand Colors"
        defaultOpen
        fields={[
          { key: "primary.base", label: "Primary", value: light.primary.base },
          {
            key: "primary.foreground",
            label: "Primary Foreground",
            value: light.primary.foreground,
          },
          { key: "secondary.base", label: "Secondary", value: light.secondary.base },
          {
            key: "secondary.foreground",
            label: "Secondary Foreground",
            value: light.secondary.foreground,
          },
          { key: "accent.base", label: "Accent", value: light.accent.base },
          { key: "accent.foreground", label: "Accent Foreground", value: light.accent.foreground },
        ]}
        onChange={handleColorChange}
      />

      {/* Surface Colors */}
      <ColorPaletteSection
        title="Surface Colors"
        defaultOpen
        fields={[
          { key: "background.base", label: "Background", value: light.background.base },
          { key: "background.foreground", label: "Text", value: light.background.foreground },
          { key: "card.base", label: "Card", value: light.card.base },
          { key: "card.foreground", label: "Card Text", value: light.card.foreground },
          { key: "popover.base", label: "Popover", value: light.popover.base },
          { key: "popover.foreground", label: "Popover Text", value: light.popover.foreground },
          { key: "muted.base", label: "Muted", value: light.muted.base },
          { key: "muted.foreground", label: "Muted Text", value: light.muted.foreground },
        ]}
        onChange={handleColorChange}
      />

      {/* Feedback & Utility */}
      <ColorPaletteSection
        title="Feedback & Utility Colors"
        defaultOpen
        fields={[
          { key: "destructive.base", label: "Destructive", value: light.destructive.base },
          {
            key: "destructive.foreground",
            label: "Destructive Text",
            value: light.destructive.foreground,
          },
          { key: "border", label: "Border", value: light.border },
          { key: "input", label: "Input Border", value: light.input },
          { key: "ring", label: "Focus Ring", value: light.ring },
        ]}
        onChange={handleColorChange}
      />

      {/* Sidebar */}
      <ColorPaletteSection
        title="Sidebar Colors"
        defaultOpen
        fields={[
          { key: "sidebar.background", label: "Background", value: light.sidebar.background },
          { key: "sidebar.foreground", label: "Text", value: light.sidebar.foreground },
          { key: "sidebar.primary", label: "Primary", value: light.sidebar.primary },
          {
            key: "sidebar.primaryForeground",
            label: "Primary Text",
            value: light.sidebar.primaryForeground,
          },
          { key: "sidebar.accent", label: "Accent", value: light.sidebar.accent },
          {
            key: "sidebar.accentForeground",
            label: "Accent Text",
            value: light.sidebar.accentForeground,
          },
          { key: "sidebar.border", label: "Border", value: light.sidebar.border },
          { key: "sidebar.ring", label: "Ring", value: light.sidebar.ring },
        ]}
        onChange={handleColorChange}
      />

      {/* Semantic: Risk */}
      <ColorPaletteSection
        title="Risk Level Colors"
        defaultOpen
        fields={[
          { key: "riskCritical", label: "Critical", value: light.riskCritical },
          { key: "riskCriticalLight", label: "Critical Light", value: light.riskCriticalLight },
          { key: "riskHigh", label: "High", value: light.riskHigh },
          { key: "riskHighLight", label: "High Light", value: light.riskHighLight },
          { key: "riskMedium", label: "Medium", value: light.riskMedium },
          { key: "riskMediumLight", label: "Medium Light", value: light.riskMediumLight },
          { key: "riskLow", label: "Low", value: light.riskLow },
          { key: "riskLowLight", label: "Low Light", value: light.riskLowLight },
        ]}
        onChange={handleColorChange}
      />

      {/* Semantic: Status */}
      <ColorPaletteSection
        title="Status Colors"
        defaultOpen
        fields={[
          { key: "statusCritical", label: "Critical", value: light.statusCritical },
          { key: "statusWarning", label: "Warning", value: light.statusWarning },
          { key: "statusSuccess", label: "Success", value: light.statusSuccess },
          { key: "statusInfo", label: "Info", value: light.statusInfo },
        ]}
        onChange={handleColorChange}
      />

      {/* Neutral Scale */}
      <ColorPaletteSection
        title="Neutral Scale (Slate)"
        defaultOpen
        fields={[
          { key: "slate50", label: "Slate 50", value: light.slate50 },
          { key: "slate100", label: "Slate 100", value: light.slate100 },
          { key: "slate200", label: "Slate 200", value: light.slate200 },
          { key: "slate500", label: "Slate 500", value: light.slate500 },
          { key: "slate600", label: "Slate 600", value: light.slate600 },
          { key: "slate700", label: "Slate 700", value: light.slate700 },
          { key: "slate800", label: "Slate 800", value: light.slate800 },
        ]}
        onChange={handleColorChange}
      />

      {/* Gold */}
      <ColorPaletteSection
        title="Accent Highlights"
        defaultOpen
        fields={[
          { key: "gold", label: "Gold", value: light.gold },
          { key: "goldLight", label: "Gold Light", value: light.goldLight },
        ]}
        onChange={handleColorChange}
      />

      {/* Dark Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dark Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Manual Dark Mode Override</Label>
              <p className="text-xs text-muted-foreground">
                When off, dark mode colors are automatically derived from your light palette
              </p>
            </div>
            <Switch
              checked={hasDarkOverride}
              onCheckedChange={(checked) => {
                onChange({
                  ...config,
                  colors: {
                    ...config.colors,
                    dark: checked ? { ...config.colors.light } : null,
                  },
                });
              }}
            />
          </div>
          {hasDarkOverride && (
            <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
              Manual dark palette editing is enabled. Use the dark mode toggle in the preview to see
              your changes. The full dark palette editor uses the same token structure as the light
              palette above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Typography */}
      <TypographySection
        typography={config.typography}
        onChange={(typography) => onChange({ ...config, typography })}
      />

      {/* Layout & Surfaces */}
      <SurfacesSection
        surfaces={config.surfaces}
        onChange={(surfaces) => onChange({ ...config, surfaces })}
      />

      {/* Gradients */}
      <GradientSection
        gradients={config.gradients}
        onChange={(gradients) => onChange({ ...config, gradients })}
      />

      {/* Channel Overrides */}
      <ChannelOverridesSection
        overrides={config.channelOverrides}
        baseConfig={config}
        onChange={(channelOverrides) => onChange({ ...config, channelOverrides })}
      />

      {/* Custom CSS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Custom CSS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={config.customCss}
            onChange={(e) => onChange({ ...config, customCss: e.target.value })}
            placeholder="/* Your custom CSS overrides — injected into the page */"
            className="font-mono text-sm min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            {config.customCss.length.toLocaleString()} / 50,000 characters
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
