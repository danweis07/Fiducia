/**
 * LogoSection — 4 upload zones for logo variants
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LogoSystem } from "@/types/admin";

interface LogoSectionProps {
  logos: LogoSystem;
  onChange: (logos: LogoSystem) => void;
}

const LOGO_SLOTS: { key: keyof LogoSystem; label: string; hint: string }[] = [
  {
    key: "primary",
    label: "Primary Logo",
    hint: "Full horizontal logo (SVG or PNG, min 400px wide)",
  },
  {
    key: "mark",
    label: "Logo Mark / Icon",
    hint: "Square icon for favicon, app icon, compact sidebar",
  },
  { key: "primaryDark", label: "Dark Mode Logo", hint: "Logo variant for dark backgrounds" },
  {
    key: "footer",
    label: "Footer Logo",
    hint: "Optional alternate logo for footer (leave empty to use primary)",
  },
];

export function LogoSection({ logos, onChange }: LogoSectionProps) {
  const updateSlot = (key: keyof LogoSystem, value: string | null) => {
    onChange({ ...logos, [key]: value || null });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Logos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {LOGO_SLOTS.map(({ key, label, hint }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              {logos[key] ? (
                <div className="border rounded-lg p-4 text-center space-y-2">
                  <img src={logos[key]!} alt={label} className="max-h-16 mx-auto object-contain" />
                  <Button variant="outline" size="sm" onClick={() => updateSlot(key, null)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <Input
                    placeholder="Enter logo URL..."
                    onChange={(e) => updateSlot(key, e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
