import { Link } from 'react-router-dom';
import { Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/common/currency';
import { useLoans } from '@/hooks/useLoans';
import type { ComponentManifest } from '@/types/sdui';

export default function LoanSummary({ manifest }: { manifest: ComponentManifest }) {
  const { data } = useLoans();
  const loans = data?.loans ?? [];
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'delinquent');
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.outstandingBalanceCents, 0);

  if (activeLoans.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Banknote className="h-5 w-5 text-orange-500" />
        <CardTitle className="text-lg font-semibold">
          {(manifest.props.title as string) ?? 'Loans'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold mb-3">{formatCurrency(totalOutstanding)}</p>
        <div className="space-y-2">
          {activeLoans.slice(0, 3).map((loan) => (
            <Link
              key={loan.id}
              to={`/loans/${loan.id}`}
              className="flex justify-between py-1.5 text-sm hover:text-blue-600"
            >
              <span className="text-slate-600">{loan.productName}</span>
              <span className="font-medium">{formatCurrency(loan.outstandingBalanceCents)}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
