import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/common/currency';
import { gateway } from '@/lib/gateway';
import type { ComponentManifest } from '@/types/sdui';

export default function SpendingChart({ manifest }: { manifest: ComponentManifest }) {
  const { data } = useQuery({
    queryKey: ['financial', 'spending'],
    queryFn: () => gateway.financial.spending(),
  });

  const categories = data?.byCategory?.slice(0, 5) ?? [];
  const totalSpending = data?.totalSpendingCents ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? 'Spending Overview'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold mb-4">{formatCurrency(totalSpending)} <span className="text-sm font-normal text-slate-500">this month</span></p>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{cat.category}</span>
                <span className="font-medium">{formatCurrency(cat.totalCents)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(cat.percentOfTotal, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
