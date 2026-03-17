import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ComponentManifest } from '@/types/sdui';

export default function CreditScoreWidget({ manifest }: { manifest: ComponentManifest }) {
  const { score, change, provider } = manifest.props as Record<string, unknown>;
  const scoreNum = (score as number) ?? 0;

  const getScoreColor = (s: number) => {
    if (s >= 750) return 'text-emerald-600';
    if (s >= 670) return 'text-blue-600';
    if (s >= 580) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        <CardTitle className="text-lg font-semibold">Credit Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-bold ${getScoreColor(scoreNum)}`}>{scoreNum || '--'}</span>
          {change && (
            <span className={`text-sm font-medium ${(change as number) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {(change as number) >= 0 ? '+' : ''}{change as number} pts
            </span>
          )}
        </div>
        {provider && <p className="text-xs text-slate-400 mt-2">Provided by {provider as string}</p>}
      </CardContent>
    </Card>
  );
}
