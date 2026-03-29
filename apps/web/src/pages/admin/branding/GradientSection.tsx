/**
 * GradientSection — Configure gradient tokens for hero, card highlights, sidebar
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GradientTokens, GradientDefinition } from "@/types/admin";
import { ColorPickerField } from "./ColorPickerField";
import { hslToHex } from "@/lib/theme/color-utils";

interface GradientSectionProps {
  gradients: GradientTokens;
  onChange: (gradients: GradientTokens) => void;
}

const DIRECTION_OPTIONS: {
  value: GradientDefinition["direction"];
  label: string;
}[] = [
  { value: "to-r", label: "Left → Right" },
  { value: "to-br", label: "Top-Left → Bottom-Right" },
  { value: "to-b", label: "Top → Bottom" },
  { value: "to-bl", label: "Top-Right → Bottom-Left" },
];

const GRADIENT_SLOTS: { key: keyof GradientTokens; label: string; description: string }[] = [
  {
    key: "hero",
    label: "Hero Gradient",
    description: "Background gradient for hero sections on the public site",
  },
  {
    key: "cardHighlight",
    label: "Card Highlight Gradient",
    description: "Accent gradient for featured cards and promotional banners",
  },
  {
    key: "sidebar",
    label: "Sidebar Gradient",
    description: "Optional gradient background for the navigation sidebar",
  },
];

function GradientEditor({
  gradient,
  onChange,
  onRemove,
}: {
  gradient: GradientDefinition;
  onChange: (g: GradientDefinition) => void;
  onRemove: () => void;
}) {
  const dirMap = {
    "to-r": "to right",
    "to-br": "to bottom right",
    "to-b": "to bottom",
    "to-bl": "to bottom left",
  } as const;
  const previewGradient = `linear-gradient(${dirMap[gradient.direction]}, ${hslToHex(gradient.from)}, ${hslToHex(gradient.to)})`;

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="h-12 rounded-md border" style={{ background: previewGradient }} />

      <div className="grid grid-cols-2 gap-3">
        <ColorPickerField
          label="From"
          value={gradient.from}
          onChange={(v) => onChange({ ...gradient, from: v })}
        />
        <ColorPickerField
          label="To"
          value={gradient.to}
          onChange={(v) => onChange({ ...gradient, to: v })}
        />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label>Direction</Label>
          <Select
            value={gradient.direction}
            onValueChange={(v) =>
              onChange({ ...gradient, direction: v as GradientDefinition["direction"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIRECTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}

export function GradientSection({ gradients, onChange }: GradientSectionProps) {
  function updateSlot(key: keyof GradientTokens, value: GradientDefinition | null) {
    onChange({ ...gradients, [key]: value });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Gradients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {GRADIENT_SLOTS.map(({ key, label, description }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={gradients[key] !== null}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateSlot(key, {
                      from: "215 50% 25%",
                      to: "38 75% 50%",
                      direction: "to-r",
                    });
                  } else {
                    updateSlot(key, null);
                  }
                }}
              />
            </div>
            {gradients[key] && (
              <GradientEditor
                gradient={gradients[key]}
                onChange={(g) => updateSlot(key, g)}
                onRemove={() => updateSlot(key, null)}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
