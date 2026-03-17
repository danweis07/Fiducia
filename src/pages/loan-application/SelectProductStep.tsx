import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/common/currency";
import type { LoanProduct } from "@/types";
import type { FormData } from "./constants";
import { loanTypeIcon, LOAN_TYPE_LABEL_KEYS } from "./constants";

export function SelectProductStep({
  products,
  form,
  fieldError,
  updateField,
  onNext,
}: {
  products: LoanProduct[];
  form: FormData;
  fieldError: (field: string) => React.ReactNode;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onNext: () => void;
}) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("loanApplication.chooseType")}</CardTitle>
        <CardDescription>
          {t("loanApplication.chooseTypeDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {t("loanApplication.noProducts")}
          </p>
        )}
        {products.map((product) => {
          const Icon = loanTypeIcon(product.loanType);
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                updateField("selectedProductId", product.id);
                updateField("selectedLoanType", product.loanType);
              }}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border text-left transition-colors ${
                form.selectedProductId === product.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="mt-0.5"><Icon className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="secondary">{t(LOAN_TYPE_LABEL_KEYS[product.loanType] || product.loanType)}</Badge>
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>
                    {t("loanApplication.rate")}: {(product.interestRateBps / 100).toFixed(2)}% {product.rateType}
                  </span>
                  <span>
                    {formatCurrency(product.minAmountCents)} &ndash;{" "}
                    {formatCurrency(product.maxAmountCents)}
                  </span>
                  <span>
                    {product.minTermMonths}&ndash;{product.maxTermMonths} {t("loanApplication.months")}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
        {fieldError("selectedProductId")}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onNext} disabled={!form.selectedProductId}>
          {t("loanApplication.continue")} <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
