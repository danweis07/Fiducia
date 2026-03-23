/**
 * LoanCard — Reusable loan summary card with progress bar.
 */

import { Link } from "react-router-dom";
import { Banknote, Car, Home, GraduationCap, CreditCard, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/common/currency";
import type { LoanType, LoanStatus } from "@/types";

export const loanIcons: Record<LoanType, React.ElementType> = {
  personal: Banknote,
  auto: Car,
  mortgage: Home,
  heloc: Home,
  credit_builder: CreditCard,
  student: GraduationCap,
  business: Briefcase,
  line_of_credit: CreditCard,
  other: Banknote,
};

export const loanStatusVariant = (status: LoanStatus) => {
  switch (status) {
    case "active":
      return "secondary" as const;
    case "delinquent":
    case "default":
    case "charged_off":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

export const loanTypeLabels: Record<LoanType, string> = {
  personal: "Personal Loan",
  auto: "Auto Loan",
  mortgage: "Mortgage",
  heloc: "HELOC",
  credit_builder: "Credit Builder",
  student: "Student Loan",
  business: "Business Loan",
  line_of_credit: "Line of Credit",
  other: "Loan",
};

interface LoanCardProps {
  id: string;
  loanType: LoanType;
  loanNumberMasked: string;
  principalCents: number;
  outstandingBalanceCents: number;
  status: LoanStatus;
  daysPastDue: number;
  nextPaymentDueDate?: string | null;
  nextPaymentAmountCents?: number | null;
  locale?: string;
}

export function LoanCard({
  id,
  loanType,
  loanNumberMasked,
  principalCents,
  outstandingBalanceCents,
  status,
  daysPastDue,
  nextPaymentDueDate,
  nextPaymentAmountCents,
  locale,
}: LoanCardProps) {
  const Icon = loanIcons[loanType] ?? Banknote;
  const progressPct =
    principalCents > 0
      ? Math.round(((principalCents - outstandingBalanceCents) / principalCents) * 100)
      : 0;

  return (
    <Link to={`/loans/${id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {loanNumberMasked}
            </CardDescription>
            <Badge variant={loanStatusVariant(status)} className="capitalize">
              {daysPastDue > 0 ? `${daysPastDue}d past due` : status}
            </Badge>
          </div>
          <CardTitle className="text-base">{loanTypeLabels[loanType]}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(outstandingBalanceCents)}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progressPct}%</span>
          </div>
          {nextPaymentDueDate && nextPaymentAmountCents && (
            <p className="text-xs text-muted-foreground mt-1">
              Next: {formatCurrency(nextPaymentAmountCents)} due{" "}
              {new Date(nextPaymentDueDate).toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
