import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComponentManifest } from "@/types/sdui";

interface ChecklistItem {
  label: string;
  completed: boolean;
  link: string;
}

export default function OnboardingChecklist({ manifest }: { manifest: ComponentManifest }) {
  const items = (manifest.props.items as ChecklistItem[]) ?? [];
  const completedCount = items.filter((i) => i.completed).length;

  if (items.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? "Get Started"}
        </CardTitle>
        <p className="text-sm text-slate-500">
          {completedCount} of {items.length} complete
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full bg-blue-100 rounded-full h-2 mb-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <Link
              key={i}
              to={item.link}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-blue-100/50 transition-colors"
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300 shrink-0" />
              )}
              <span
                className={`text-sm ${item.completed ? "text-slate-400 line-through" : "text-slate-700 font-medium"}`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
