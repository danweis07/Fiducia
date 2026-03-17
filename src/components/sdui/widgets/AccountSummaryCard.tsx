import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/common/currency';
import { useAccounts } from '@/hooks/useAccounts';
import type { ComponentManifest } from '@/types/sdui';

export default function AccountSummaryCard({ manifest }: { manifest: ComponentManifest }) {
  const { data } = useAccounts();
  const accounts = data?.accounts ?? [];
  const showCount = (manifest.props.maxAccounts as number) ?? 3;
  const totalBalanceCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? 'Your Accounts'}
        </CardTitle>
        <Wallet className="h-5 w-5 text-slate-400" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-slate-900 mb-4">{formatCurrency(totalBalanceCents)}</p>
        <div className="space-y-2">
          {accounts.slice(0, showCount).map((account) => (
            <Link
              key={account.id}
              to={`/accounts/${account.id}`}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm text-slate-600">{account.nickname ?? account.accountType}</span>
              <span className="text-sm font-medium">{formatCurrency(account.balanceCents)}</span>
            </Link>
          ))}
        </div>
        {accounts.length > showCount && (
          <Link to="/accounts" className="text-sm text-blue-600 hover:underline mt-2 block">
            View all {accounts.length} accounts
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
