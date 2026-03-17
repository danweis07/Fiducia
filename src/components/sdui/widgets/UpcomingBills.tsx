import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/common/currency';
import { gateway } from '@/lib/gateway';
import type { ComponentManifest } from '@/types/sdui';

export default function UpcomingBills({ manifest }: { manifest: ComponentManifest }) {
  const { data } = useQuery({
    queryKey: ['billpay', 'payees'],
    queryFn: () => gateway.billpay.listPayees(),
  });

  const payees = (data?.payees ?? [])
    .filter(p => p.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())
    .slice(0, (manifest.props.limit as number) ?? 3);

  if (payees.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Receipt className="h-5 w-5 text-violet-500" />
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? 'Upcoming Bills'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {payees.map((payee) => (
            <div key={payee.payeeId} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{payee.billerName}</p>
                <p className="text-xs text-slate-500">
                  Due {new Date(payee.nextDueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              {payee.nextAmountDueCents && (
                <span className="text-sm font-medium">{formatCurrency(payee.nextAmountDueCents)}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
