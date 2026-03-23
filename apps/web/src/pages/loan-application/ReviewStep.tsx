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
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { LoanProduct } from "@/types";
import type { FormData } from "./constants";
import { LOAN_TYPE_LABEL_KEYS } from "./constants";

export function ReviewStep({
  form,
  selectedProduct,
  documents,
  errors,
  isSubmitting,
  onSubmit,
  onBack,
}: {
  form: FormData;
  selectedProduct: LoanProduct | undefined;
  documents: Array<{ name: string; uploaded: boolean }>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("loanApplication.reviewTitle")}</CardTitle>
        <CardDescription>{t("loanApplication.reviewDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loan Type */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("loanApplication.loanTypeLabel")}
          </h3>
          <p className="font-medium">
            {selectedProduct?.name ?? "—"}{" "}
            <Badge variant="secondary">
              {selectedProduct
                ? t(LOAN_TYPE_LABEL_KEYS[selectedProduct.loanType] || selectedProduct.loanType)
                : "—"}
            </Badge>
          </p>
        </div>

        {/* Personal */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("loanApplication.applicant")}
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("loanApplication.nameLabel")}</span>
            <span>
              {form.firstName} {form.lastName}
            </span>
            <span className="text-muted-foreground">{t("loanApplication.email")}</span>
            <span>{form.email}</span>
            <span className="text-muted-foreground">{t("loanApplication.phone")}</span>
            <span>{form.phone}</span>
            <span className="text-muted-foreground">{t("loanApplication.addressLabel")}</span>
            <span>
              {form.addressLine1}
              {form.addressLine2 ? `, ${form.addressLine2}` : ""}, {form.city}, {form.state}{" "}
              {form.zip}
            </span>
          </div>
        </div>

        {/* Employment */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("loanApplication.employmentAndIncome")}
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("loanApplication.reviewStatus")}</span>
            <span className="capitalize">{form.employmentStatus.replace("_", " ")}</span>
            {form.employerName && (
              <>
                <span className="text-muted-foreground">{t("loanApplication.reviewEmployer")}</span>
                <span>{form.employerName}</span>
              </>
            )}
            <span className="text-muted-foreground">{t("loanApplication.reviewAnnualIncome")}</span>
            <span>${parseFloat(form.annualIncomeDollars || "0").toLocaleString()}</span>
          </div>
        </div>

        {/* Loan Details */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("loanApplication.loanDetailsTitle")}
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("loanApplication.reviewAmount")}</span>
            <span>${parseFloat(form.requestedAmountDollars || "0").toLocaleString()}</span>
            <span className="text-muted-foreground">{t("loanApplication.reviewTerm")}</span>
            <span>
              {form.termMonths} {t("loanApplication.months")}
            </span>
            <span className="text-muted-foreground">{t("loanApplication.reviewPurpose")}</span>
            <span>{form.purpose}</span>
            {selectedProduct && (
              <>
                <span className="text-muted-foreground">{t("loanApplication.rate")}</span>
                <span>
                  {(selectedProduct.interestRateBps / 100).toFixed(2)}% {selectedProduct.rateType}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Co-applicant */}
        {form.hasCoApplicant && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("loanApplication.reviewCoApplicant")}
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">{t("loanApplication.reviewName")}</span>
              <span>
                {form.coFirstName} {form.coLastName}
              </span>
              {form.coEmail && (
                <>
                  <span className="text-muted-foreground">{t("loanApplication.email")}</span>
                  <span>{form.coEmail}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("loanApplication.reviewDocuments", { count: documents.length })}
            </h3>
            <div className="space-y-1">
              {documents.map((doc, i) => (
                <p key={i} className="text-sm flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  {doc.name}
                </p>
              ))}
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {errors.submit}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("loanApplication.back")}
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("loanApplication.submitting")}
            </>
          ) : (
            t("loanApplication.submitApplication")
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
