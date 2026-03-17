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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type { FormData } from "./constants";

export function FundingStep({
  form,
  errors,
  allowedFundingMethods,
  isSubmitting,
  updateField,
  onSubmit,
  onBack,
}: {
  form: FormData;
  errors: Record<string, string>;
  allowedFundingMethods: string[];
  isSubmitting: boolean;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");

  const fundingLabels: Record<string, string> = {
    ach_transfer: t("accountOpening.fundingAch"),
    debit_card: t("accountOpening.fundingDebitCard"),
    internal_transfer: t("accountOpening.fundingInternalTransfer"),
    none: t("accountOpening.fundingSkip"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountOpening.fundYourAccount")}</CardTitle>
        <CardDescription>
          {t("accountOpening.fundYourAccountDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("accountOpening.fundingMethod")}</Label>
          <Select
            value={form.fundingMethod}
            onValueChange={(val) => updateField("fundingMethod", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("accountOpening.selectFundingMethod")} />
            </SelectTrigger>
            <SelectContent>
              {allowedFundingMethods.map((method) => (
                <SelectItem key={method} value={method}>
                  {fundingLabels[method] || method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.fundingMethod && (
            <p className="text-xs text-destructive">{errors.fundingMethod}</p>
          )}
        </div>

        {form.fundingMethod && form.fundingMethod !== "none" && (
          <div className="space-y-2">
            <Label htmlFor="fundingAmount">{t("accountOpening.depositAmount")}</Label>
            <Input
              id="fundingAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.fundingAmountDollars}
              onChange={(e) =>
                updateField("fundingAmountDollars", e.target.value)
              }
              placeholder="100.00"
            />
            {errors.fundingAmountDollars && (
              <p className="text-xs text-destructive">
                {errors.fundingAmountDollars}
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("accountOpening.back")}
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("accountOpening.processing")}
            </>
          ) : form.fundingMethod === "none" ? (
            <>
              {t("accountOpening.skipAndComplete")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              {t("accountOpening.fundAndComplete")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
