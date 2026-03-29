/**
 * SurfacesSection — Border radius, card shadow, layout theme controls
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { SurfaceTokens } from "@/types/admin";

interface SurfacesSectionProps {
  surfaces: SurfaceTokens;
  onChange: (surfaces: SurfaceTokens) => void;
}

const RADIUS_OPTIONS: { value: SurfaceTokens["borderRadius"]; label: string; preview: string }[] = [
  { value: "none", label: "None", preview: "rounded-none" },
  { value: "sm", label: "Small", preview: "rounded-sm" },
  { value: "md", label: "Medium", preview: "rounded-md" },
  { value: "lg", label: "Large", preview: "rounded-lg" },
  { value: "full", label: "Full", preview: "rounded-full" },
];

const ELEVATION_OPTIONS: {
  value: SurfaceTokens["cardElevation"];
  label: string;
  shadow: string;
}[] = [
  { value: "flat", label: "Flat", shadow: "shadow-none" },
  { value: "subtle", label: "Subtle", shadow: "shadow-sm" },
  { value: "raised", label: "Raised", shadow: "shadow-md" },
];

const BUTTON_SHAPE_OPTIONS: {
  value: SurfaceTokens["buttonShape"];
  label: string;
  preview: string;
}[] = [
  { value: "square", label: "Square", preview: "rounded-sm" },
  { value: "rounded", label: "Rounded", preview: "rounded-md" },
  { value: "pill", label: "Pill", preview: "rounded-full" },
];

const LAYOUT_OPTIONS: {
  value: SurfaceTokens["layoutTheme"];
  label: string;
  description: string;
}[] = [
  { value: "modern", label: "Modern", description: "Clean, rounded, generous spacing" },
  { value: "classic", label: "Classic", description: "Traditional banking feel" },
  { value: "compact", label: "Compact", description: "Dense, data-focused" },
  { value: "sidebar", label: "Sidebar", description: "Side navigation layout" },
  { value: "dashboard", label: "Dashboard", description: "Executive analytics view" },
];

export function SurfacesSection({ surfaces, onChange }: SurfacesSectionProps) {
  const update = (partial: Partial<SurfaceTokens>) => {
    onChange({ ...surfaces, ...partial });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Layout & Surfaces</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Border Radius */}
        <div className="space-y-1.5">
          <Label>Border Radius</Label>
          <div className="flex gap-3">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ borderRadius: opt.value })}
                className={`flex flex-col items-center gap-1.5 p-2 border transition-colors ${
                  surfaces.borderRadius === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                } rounded-lg`}
              >
                <div className={`h-8 w-12 bg-primary/20 border border-primary/30 ${opt.preview}`} />
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card Elevation */}
        <div className="space-y-1.5">
          <Label>Card Elevation</Label>
          <div className="flex gap-3">
            {ELEVATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ cardElevation: opt.value })}
                className={`flex flex-col items-center gap-1.5 p-3 border transition-colors rounded-lg ${
                  surfaces.cardElevation === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className={`h-8 w-16 bg-card border rounded-md ${opt.shadow}`} />
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Button Shape */}
        <div className="space-y-1.5">
          <Label>Button Shape</Label>
          <div className="flex gap-3">
            {BUTTON_SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ buttonShape: opt.value })}
                className={`flex flex-col items-center gap-1.5 p-3 border transition-colors rounded-lg ${
                  surfaces.buttonShape === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className={`h-8 w-20 bg-primary/20 border border-primary/30 ${opt.preview}`} />
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Layout Theme */}
        <div className="space-y-1.5">
          <Label>Layout Theme</Label>
          <div className="grid grid-cols-1 gap-2">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ layoutTheme: opt.value })}
                className={`text-left border rounded-lg p-3 transition-colors ${
                  surfaces.layoutTheme === opt.value
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
      </CardContent>
    </Card>
  );
}
