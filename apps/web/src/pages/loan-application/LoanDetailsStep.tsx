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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/common/currency";
import type { LoanProduct } from "@/types";
import type { FormData } from "./constants";
import { LOAN_PURPOSE_KEYS } from "./constants";

export function LoanDetailsStep({
  form,
  selectedProduct,
  termOptions,
  fieldError,
  updateField,
  onNext,
  onBack,
}: {
  form: FormData;
  selectedProduct: LoanProduct | undefined;
  termOptions: number[];
  fieldError: (field: string) => React.ReactNode;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");
  const purposes = LOAN_PURPOSE_KEYS[form.selectedLoanType] || LOAN_PURPOSE_KEYS.personal || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> {t("loanApplication.loanDetailsTitle")}
        </CardTitle>
        <CardDescription>
          {t("loanApplication.loanDetailsDesc", {
            product: selectedProduct
              ? selectedProduct.name.toLowerCase()
              : t("loanApplication.loanGeneric"),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="requestedAmount">{t("loanApplication.requestedAmount")}</Label>
          <Input
            id="requestedAmount"
            type="number"
            min="0"
            step="100"
            value={form.requestedAmountDollars}
            onChange={(e) => updateField("requestedAmountDollars", e.target.value)}
            placeholder={
              selectedProduct
                ? `${formatCurrency(selectedProduct.minAmountCents)} – ${formatCurrency(selectedProduct.maxAmountCents)}`
                : t("loanApplication.enterAmount")
            }
          />
          {fieldError("requestedAmountDollars")}
        </div>

        <div>
          <Label htmlFor="termMonths">{t("loanApplication.loanTerm")}</Label>
          <Select value={form.termMonths} onValueChange={(v) => updateField("termMonths", v)}>
            <SelectTrigger id="termMonths">
              <SelectValue placeholder={t("loanApplication.selectTerm")} />
            </SelectTrigger>
            <SelectContent>
              {termOptions.map((termVal) => (
                <SelectItem key={termVal} value={String(termVal)}>
                  {t("loanApplication.termOption", {
                    months: termVal,
                    years: (termVal / 12).toFixed(termVal % 12 === 0 ? 0 : 1),
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("termMonths")}
        </div>

        <div>
          <Label htmlFor="purpose">{t("loanApplication.loanPurpose")}</Label>
          <Select value={form.purpose} onValueChange={(v) => updateField("purpose", v)}>
            <SelectTrigger id="purpose">
              <SelectValue placeholder={t("loanApplication.selectPurpose")} />
            </SelectTrigger>
            <SelectContent>
              {purposes.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {t(p.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("purpose")}
        </div>

        {selectedProduct && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
            <p>
              <strong>{t("loanApplication.rate")}:</strong>{" "}
              {(selectedProduct.interestRateBps / 100).toFixed(2)}% {selectedProduct.rateType}
            </p>
            {selectedProduct.originationFeeBps > 0 && (
              <p>
                <strong>{t("loanApplication.originationFee")}:</strong>{" "}
                {(selectedProduct.originationFeeBps / 100).toFixed(2)}%
              </p>
            )}
            {form.requestedAmountDollars && form.termMonths && (
              <p className="text-muted-foreground">{t("loanApplication.estimatedPaymentNote")}</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="additionalNotes">{t("loanApplication.additionalNotes")}</Label>
          <Textarea
            id="additionalNotes"
            value={form.additionalNotes}
            onChange={(e) => updateField("additionalNotes", e.target.value)}
            placeholder={t("loanApplication.additionalNotesPlaceholder")}
            rows={3}
          />
        </div>

        {/* Co-applicant toggle */}
        <div className="border rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasCoApplicant}
              onChange={(e) => updateField("hasCoApplicant", e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm font-medium">{t("loanApplication.addCoApplicant")}</span>
          </label>
          {form.hasCoApplicant && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coFirstName">{t("loanApplication.coApplicantFirstName")}</Label>
                  <Input
                    id="coFirstName"
                    value={form.coFirstName}
                    onChange={(e) => updateField("coFirstName", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="coLastName">{t("loanApplication.coApplicantLastName")}</Label>
                  <Input
                    id="coLastName"
                    value={form.coLastName}
                    onChange={(e) => updateField("coLastName", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coEmail">{t("loanApplication.email")}</Label>
                  <Input
                    id="coEmail"
                    type="email"
                    value={form.coEmail}
                    onChange={(e) => updateField("coEmail", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="coPhone">{t("loanApplication.phone")}</Label>
                  <Input
                    id="coPhone"
                    type="tel"
                    value={form.coPhone}
                    onChange={(e) => updateField("coPhone", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("loanApplication.back")}
        </Button>
        <Button onClick={onNext}>
          {t("loanApplication.continue")} <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
