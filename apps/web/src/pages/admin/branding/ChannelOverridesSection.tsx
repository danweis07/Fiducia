/**
 * ChannelOverridesSection — Per-channel branding overrides
 *
 * Allows institutions to override specific design tokens for each delivery
 * channel (public site, banking web, mobile app, email) while inheriting
 * defaults from the base design system.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChannelOverride, BrandingChannel, DesignSystemConfig } from "@/types/admin";
import { ColorPickerField } from "./ColorPickerField";

interface ChannelOverridesSectionProps {
  overrides: ChannelOverride[];
  baseConfig: DesignSystemConfig;
  onChange: (overrides: ChannelOverride[]) => void;
}

const CHANNEL_LABELS: Record<BrandingChannel, string> = {
  public_site: "Public Website",
  banking_web: "Banking Web App",
  mobile_app: "Mobile App",
  email: "Email Templates",
};

const CHANNEL_DESCRIPTIONS: Record<BrandingChannel, string> = {
  public_site: "Marketing site, landing pages, public-facing content",
  banking_web: "Logged-in digital banking experience",
  mobile_app: "iOS and Android native app",
  email: "Transactional and marketing emails",
};

function ChannelOverrideEditor({
  override,
  baseConfig,
  onChange,
  onRemove,
}: {
  override: ChannelOverride;
  baseConfig: DesignSystemConfig;
  onChange: (o: ChannelOverride) => void;
  onRemove: () => void;
}) {
  const basePrimary = baseConfig.colors.light.primary.base;
  const baseAccent = baseConfig.colors.light.accent.base;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="secondary">{CHANNEL_LABELS[override.channel]}</Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {CHANNEL_DESCRIPTIONS[override.channel]}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Color Overrides
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ColorPickerField
            label="Primary"
            value={override.colors?.light?.primary?.base ?? basePrimary}
            onChange={(v) =>
              onChange({
                ...override,
                colors: {
                  light: {
                    ...override.colors?.light,
                    primary: {
                      base: v,
                      foreground: override.colors?.light?.primary?.foreground ?? "0 0% 100%",
                    },
                  },
                },
              })
            }
          />
          <ColorPickerField
            label="Accent"
            value={override.colors?.light?.accent?.base ?? baseAccent}
            onChange={(v) =>
              onChange({
                ...override,
                colors: {
                  light: {
                    ...override.colors?.light,
                    accent: {
                      base: v,
                      foreground: override.colors?.light?.accent?.foreground ?? "220 20% 12%",
                    },
                  },
                },
              })
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Surface Overrides
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Border Radius</Label>
            <Select
              value={override.surfaces?.borderRadius ?? baseConfig.surfaces.borderRadius}
              onValueChange={(v) =>
                onChange({
                  ...override,
                  surfaces: {
                    ...override.surfaces,
                    borderRadius: v as ChannelOverride["surfaces"] extends infer T
                      ? NonNullable<T>["borderRadius"]
                      : never,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["none", "sm", "md", "lg", "full"] as const).map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Button Shape</Label>
            <Select
              value={override.surfaces?.buttonShape ?? baseConfig.surfaces.buttonShape}
              onValueChange={(v) =>
                onChange({
                  ...override,
                  surfaces: {
                    ...override.surfaces,
                    buttonShape: v as ChannelOverride["surfaces"] extends infer T
                      ? NonNullable<T>["buttonShape"]
                      : never,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["square", "rounded", "pill"] as const).map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChannelOverridesSection({
  overrides,
  baseConfig,
  onChange,
}: ChannelOverridesSectionProps) {
  const usedChannels = new Set(overrides.map((o) => o.channel));
  const availableChannels = (Object.keys(CHANNEL_LABELS) as BrandingChannel[]).filter(
    (c) => !usedChannels.has(c),
  );

  function addOverride(channel: BrandingChannel) {
    onChange([...overrides, { channel }]);
  }

  function updateOverride(index: number, updated: ChannelOverride) {
    const next = [...overrides];
    next[index] = updated;
    onChange(next);
  }

  function removeOverride(index: number) {
    onChange(overrides.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Channel Overrides</CardTitle>
        <p className="text-xs text-muted-foreground">
          Customize specific tokens per delivery channel. Unset values inherit from the base design
          system.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {overrides.map((override, i) => (
          <ChannelOverrideEditor
            key={override.channel}
            override={override}
            baseConfig={baseConfig}
            onChange={(o) => updateOverride(i, o)}
            onRemove={() => removeOverride(i)}
          />
        ))}

        {availableChannels.length > 0 && (
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => addOverride(v as BrandingChannel)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add channel override..." />
              </SelectTrigger>
              <SelectContent>
                {availableChannels.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" disabled>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {overrides.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No channel overrides configured. All channels use the base design system.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
