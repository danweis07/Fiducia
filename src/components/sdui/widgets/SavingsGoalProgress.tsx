import { useQuery } from '@tanstack/react-query';
import { PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/common/currency';
import { gateway } from '@/lib/gateway';
import type { ComponentManifest } from '@/types/sdui';

export default function SavingsGoalProgress({ manifest }: { manifest: ComponentManifest }) {
  const { data } = useQuery({
    queryKey: ['goals', 'summary'],
    queryFn: () => gateway.savingsGoals.summary(),
  });

  const summary = data;
  if (!summary) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <PiggyBank className="h-5 w-5 text-emerald-500" />
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? 'Savings Goals'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500 mb-3">
          {summary.activeGoals} active goal{summary.activeGoals !== 1 ? 's' : ''}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{formatCurrency(summary.totalSavedCents)}</span>
          <span className="text-sm text-slate-500">of {formatCurrency(summary.totalTargetCents)}</span>
        </div>
        {summary.totalTargetCents > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-3 mt-3">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(Math.round((summary.totalSavedCents / summary.totalTargetCents) * 100), 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
