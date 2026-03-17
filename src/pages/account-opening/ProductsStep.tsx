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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatInterestRate } from "@/lib/common/currency";
import type { FormData, ProductConfig } from "./constants";
import { productTypeIcon, PRODUCT_TYPE_BADGE_KEYS } from "./constants";

export function ProductsStep({
  products,
  form,
  errors,
  configLoading,
  updateField,
  onNext,
  onBack,
}: {
  products: ProductConfig[];
  form: FormData;
  errors: Record<string, string>;
  configLoading: boolean;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");

  if (configLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("accountOpening.loadingProducts")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountOpening.selectProducts")}</CardTitle>
        <CardDescription>
          {t("accountOpening.selectProductsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.selectedProductIds && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errors.selectedProductIds}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((product) => {
            const isSelected = form.selectedProductIds.includes(product.id);
            const Icon = productTypeIcon(product.type);
            return (
              <Card
                key={product.id}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/30"
                }`}
                onClick={() => {
                  updateField(
                    "selectedProductIds",
                    isSelected
                      ? form.selectedProductIds.filter((id) => id !== product.id)
                      : [...form.selectedProductIds, product.id]
                  );
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-base">{product.name}</CardTitle>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        updateField(
                          "selectedProductIds",
                          checked
                            ? [...form.selectedProductIds, product.id]
                            : form.selectedProductIds.filter((id) => id !== product.id)
                        );
                      }}
                    />
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {PRODUCT_TYPE_BADGE_KEYS[product.type] ? t(PRODUCT_TYPE_BADGE_KEYS[product.type]) : product.type}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{product.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="font-medium text-primary">
                      {formatInterestRate(product.apyBps)} {t("accountOpening.apy")}
                    </span>
                    <span>
                      {t("accountOpening.minDeposit", { amount: formatCurrency(product.minOpeningDepositCents) })}
                    </span>
                    {product.monthlyFeeCents > 0 ? (
                      <span>
                        {t("accountOpening.monthlyFee", { amount: formatCurrency(product.monthlyFeeCents) })}
                      </span>
                    ) : (
                      <span className="text-green-600">{t("accountOpening.noMonthlyFee")}</span>
                    )}
                    {product.termMonths && (
                      <span>{t("accountOpening.monthTerm", { count: product.termMonths })}</span>
                    )}
                  </div>
                  {product.feeWaiverDescription && (
                    <p className="text-xs text-muted-foreground italic">
                      {product.feeWaiverDescription}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("accountOpening.back")}
        </Button>
        <Button onClick={onNext}>
          {t("accountOpening.continue")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
