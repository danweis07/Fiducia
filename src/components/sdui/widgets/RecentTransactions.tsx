import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionRow } from '@/components/common/TransactionRow';
import { useTransactions } from '@/hooks/useTransactions';
import type { ComponentManifest } from '@/types/sdui';

export default function RecentTransactions({ manifest }: { manifest: ComponentManifest }) {
  const limit = (manifest.props.limit as number) ?? 5;
  const { data, isLoading } = useTransactions({ limit });
  const transactions = data?.transactions ?? [];

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-slate-100 rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? 'Recent Activity'}
        </CardTitle>
        <Link to="/transactions" className="text-sm text-blue-600 hover:underline">View all</Link>
      </CardHeader>
      <CardContent className="px-0">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500 px-6">No recent transactions</p>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
