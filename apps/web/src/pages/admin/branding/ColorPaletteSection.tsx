/**
 * ColorPaletteSection — Grid of color pickers for a group of palette tokens
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorPickerField } from "./ColorPickerField";

interface ColorField {
  key: string;
  label: string;
  value: string;
}

interface ColorPaletteSectionProps {
  title: string;
  fields: ColorField[];
  onChange: (key: string, value: string) => void;
  defaultOpen?: boolean;
}

export function ColorPaletteSection({
  title,
  fields,
  onChange,
  defaultOpen = false,
}: ColorPaletteSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      {defaultOpen && (
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => (
              <ColorPickerField
                key={field.key}
                id={`color-${field.key}`}
                label={field.label}
                value={field.value}
                onChange={(v) => onChange(field.key, v)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
