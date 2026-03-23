import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/common/currency";
import { cn } from "@/lib/utils";
import { transactionColors } from "@/lib/common/design-tokens";
import { useTranslation } from "react-i18next";

interface TransactionRowProps {
  description: string;
  amountCents: number;
  category?: string;
  status?: string;
  date?: string;
  runningBalanceCents?: number;
  className?: string;
  compact?: boolean;
}

export function TransactionRow({
  description,
  amountCents,
  category,
  status,
  date,
  runningBalanceCents,
  className,
  compact = false,
}: TransactionRowProps) {
  const { t, i18n } = useTranslation("banking");
  const isCredit = amountCents >= 0;
  const colors = isCredit ? transactionColors.credit : transactionColors.debit;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      ...(compact ? {} : { year: "numeric" }),
    });

  return (
    <div className={cn("flex items-center justify-between py-3 px-4", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("rounded-full p-2 shrink-0", colors.icon)}>
          {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {date && <span>{formatDate(date)}</span>}
            {category && <span className="capitalize">{category}</span>}
            {status === "pending" && (
              <Badge variant="outline" className="text-[10px] py-0">
                {t("transactions.pending")}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className={cn("text-sm font-semibold", isCredit && colors.text)}>
          {isCredit ? "+" : ""}
          {formatCurrency(Math.abs(amountCents))}
        </p>
        {runningBalanceCents !== undefined && (
          <p className="text-xs text-muted-foreground">{formatCurrency(runningBalanceCents)}</p>
        )}
      </div>
    </div>
  );
}
