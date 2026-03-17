import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/common/currency';
import { gateway } from '@/lib/gateway';
import type { ComponentManifest } from '@/types/sdui';

export default function NetWorthTracker({ manifest }: { manifest: ComponentManifest }) {
  const { data } = useQuery({
    queryKey: ['financial', 'networth'],
    queryFn: () => gateway.financial.netWorth(),
  });

  if (!data) return null;

  const isPositive = data.netWorthCents >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        {isPositive ? (
          <TrendingUp className="h-5 w-5 text-emerald-500" />
        ) : (
          <TrendingDown className="h-5 w-5 text-red-500" />
        )}
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? 'Net Worth'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(data.netWorthCents)}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-slate-500">Assets</p>
            <p className="font-medium text-emerald-600">{formatCurrency(data.totalAssetsCents)}</p>
          </div>
          <div>
            <p className="text-slate-500">Liabilities</p>
            <p className="font-medium text-red-600">{formatCurrency(data.totalLiabilitiesCents)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
