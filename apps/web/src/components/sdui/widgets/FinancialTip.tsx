import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ComponentManifest } from "@/types/sdui";

export default function FinancialTip({ manifest }: { manifest: ComponentManifest }) {
  const { title, body, category } = manifest.props as Record<string, string | number | boolean>;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4 flex gap-3">
        <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          {category && (
            <span className="text-xs font-medium text-amber-600 uppercase">
              {category as string}
            </span>
          )}
          <h4 className="font-medium text-sm text-slate-900">
            {(title as string) ?? "Financial Tip"}
          </h4>
          {body && <p className="text-sm text-slate-600 mt-1">{body as string}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
