/**
 * AccountCard — Reusable account summary card used across Dashboard, Accounts, and Transfer pages.
 */

import { Link } from 'react-router-dom';
import {
  Landmark, PiggyBank, TrendingUp, Landmark as CD,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/common/currency';

export const accountIcons: Record<string, React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  money_market: TrendingUp,
  cd: CD,
};

export const accountStatusVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'secondary' as const;
    case 'frozen':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
};

interface AccountCardProps {
  id: string;
  type: string;
  nickname?: string | null;
  accountNumberMasked: string;
  balanceCents: number;
  availableBalanceCents: number;
  status: string;
  /** If false, renders without Link wrapper */
  linkable?: boolean;
}

export function AccountCard({
  id, type, nickname, accountNumberMasked,
  balanceCents, availableBalanceCents, status,
  linkable = true,
}: AccountCardProps) {
  const Icon = accountIcons[type] ?? Landmark;

  const content = (
    <Card className={linkable ? 'hover:bg-muted/50 transition-colors cursor-pointer' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="flex items-center gap-2 capitalize">
            <Icon className="h-4 w-4" />
            {type} {accountNumberMasked}
          </CardDescription>
          <Badge variant={accountStatusVariant(status)} className="capitalize">
            {status}
          </Badge>
        </div>
        {nickname && <CardTitle className="text-base">{nickname}</CardTitle>}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{formatCurrency(balanceCents)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Available: {formatCurrency(availableBalanceCents)}
        </p>
      </CardContent>
    </Card>
  );

  if (!linkable) return content;

  return <Link to={`/accounts/${id}`}>{content}</Link>;
}
