import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/AppShell";
import {
  useLoanProducts,
  useCreateLoanApplication,
  useUploadLoanDocument,
} from "@/hooks/useLoanOrigination";
import { isValidEmail, isValidUSPhone } from "@/lib/common/validators";
import { formatCurrency } from "@/lib/common/currency";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { LoanProduct } from "@/types";
import {
  STEP_ORDER,
  STEP_LABEL_KEYS,
  INITIAL_FORM,
  SelectProductStep,
  PersonalInfoStep,
  EmploymentStep,
  LoanDetailsStep,
  DocumentsStep,
  ReviewStep,
  SubmittedStep,
} from "./loan-application";
import type { StepId, FormData } from "./loan-application";

// =============================================================================
// COMPONENT
// =============================================================================

export default function LoanApplication() {
  const { t } = useTranslation("banking");
  const [step, setStep] = useState<StepId>("select-product");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Array<{ name: string; uploaded: boolean }>>([]);

  const { data: productsData, isLoading: productsLoading } = useLoanProducts();
  const createApplication = useCreateLoanApplication();
  const uploadDocument = useUploadLoanDocument();
  void uploadDocument; // reserved for document upload feature

  const products = useMemo(() => {
    const list = (productsData as { products?: LoanProduct[] })?.products;
    return list?.filter((p) => p.isActive) ?? [];
  }, [productsData]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.selectedProductId),
    [products, form.selectedProductId],
  );

  const stepIndex = STEP_ORDER.indexOf(step);
  const progressPercent = ((stepIndex + 1) / STEP_ORDER.length) * 100;

  // Form field updater
  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }, [step]);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }, [step]);

  // =============================================================================
  // VALIDATION
  // =============================================================================

  const validateProduct = useCallback((): boolean => {
    if (!form.selectedProductId) {
      setErrors({ selectedProductId: t("loanApplication.errors.selectLoanType") });
      return false;
    }
    setErrors({});
    return true;
  }, [form.selectedProductId, t]);

  const validatePersonal = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t("loanApplication.errors.firstNameRequired");
    if (!form.lastName.trim()) errs.lastName = t("loanApplication.errors.lastNameRequired");
    if (!form.email.trim()) {
      errs.email = t("loanApplication.errors.emailRequired");
    } else if (!isValidEmail(form.email)) {
      errs.email = t("loanApplication.errors.invalidEmail");
    }
    if (!form.phone.trim()) {
      errs.phone = t("loanApplication.errors.phoneRequired");
    } else if (!isValidUSPhone(form.phone)) {
      errs.phone = t("loanApplication.errors.invalidPhone");
    }
    if (!form.addressLine1.trim()) errs.addressLine1 = t("loanApplication.errors.addressRequired");
    if (!form.city.trim()) errs.city = t("loanApplication.errors.cityRequired");
    if (!form.state) errs.state = t("loanApplication.errors.stateRequired");
    if (!form.zip.trim()) {
      errs.zip = t("loanApplication.errors.zipRequired");
    } else if (!/^\d{5}(-\d{4})?$/.test(form.zip)) {
      errs.zip = t("loanApplication.errors.invalidZip");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, t]);

  const validateEmployment = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.employmentStatus)
      errs.employmentStatus = t("loanApplication.errors.employmentStatusRequired");
    if (
      (form.employmentStatus === "employed" || form.employmentStatus === "self_employed") &&
      !form.employerName.trim()
    ) {
      errs.employerName = t("loanApplication.errors.employerNameRequired");
    }
    if (!form.annualIncomeDollars.trim()) {
      errs.annualIncomeDollars = t("loanApplication.errors.annualIncomeRequired");
    } else {
      const income = parseFloat(form.annualIncomeDollars);
      if (isNaN(income) || income <= 0)
        errs.annualIncomeDollars = t("loanApplication.errors.invalidIncome");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, t]);

  const validateLoanDetails = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.requestedAmountDollars.trim()) {
      errs.requestedAmountDollars = t("loanApplication.errors.loanAmountRequired");
    } else {
      const amount = parseFloat(form.requestedAmountDollars);
      if (isNaN(amount) || amount <= 0) {
        errs.requestedAmountDollars = t("loanApplication.errors.invalidAmount");
      } else if (selectedProduct) {
        if (amount * 100 < selectedProduct.minAmountCents) {
          errs.requestedAmountDollars = t("loanApplication.errors.minimumAmount", {
            amount: formatCurrency(selectedProduct.minAmountCents),
          });
        }
        if (amount * 100 > selectedProduct.maxAmountCents) {
          errs.requestedAmountDollars = t("loanApplication.errors.maximumAmount", {
            amount: formatCurrency(selectedProduct.maxAmountCents),
          });
        }
      }
    }
    if (!form.termMonths) errs.termMonths = t("loanApplication.errors.loanTermRequired");
    if (!form.purpose) errs.purpose = t("loanApplication.errors.loanPurposeRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, selectedProduct, t]);

  // =============================================================================
  // STEP HANDLERS
  // =============================================================================

  const handleNextFromProduct = useCallback(() => {
    if (validateProduct()) goNext();
  }, [validateProduct, goNext]);

  const handleNextFromPersonal = useCallback(() => {
    if (validatePersonal()) goNext();
  }, [validatePersonal, goNext]);

  const handleNextFromEmployment = useCallback(() => {
    if (validateEmployment()) goNext();
  }, [validateEmployment, goNext]);

  const handleNextFromLoanDetails = useCallback(() => {
    if (validateLoanDetails()) goNext();
  }, [validateLoanDetails, goNext]);

  const handleSubmit = useCallback(async () => {
    try {
      const result = await createApplication.mutateAsync({
        institutionId: "",
        requestedAmountCents: Math.round(parseFloat(form.requestedAmountDollars) * 100),
        termMonths: parseInt(form.termMonths, 10),
        productId: form.selectedProductId,
        applicant: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
        },
        coApplicant: form.hasCoApplicant
          ? {
              firstName: form.coFirstName,
              lastName: form.coLastName,
              email: form.coEmail,
              phone: form.coPhone,
            }
          : undefined,
        additionalFields: {
          employmentStatus: form.employmentStatus,
          employerName: form.employerName,
          annualIncomeCents: Math.round(parseFloat(form.annualIncomeDollars) * 100),
          purpose: form.purpose,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          state: form.state,
          zip: form.zip,
          additionalNotes: form.additionalNotes,
        },
      });
      const app = (result as { application?: { id: string } })?.application;
      if (app?.id) setApplicationId(app.id);
      setStep("submitted");
    } catch {
      setErrors({ submit: t("loanApplication.errors.submitFailed") });
    }
  }, [form, createApplication]);

  const handleDocumentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        setDocuments((prev) => [...prev, { name: file.name, uploaded: true }]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // =============================================================================
  // ERROR HELPER
  // =============================================================================

  const fieldError = (field: string) =>
    errors[field] ? <p className="text-sm text-destructive mt-1">{errors[field]}</p> : null;

  // =============================================================================
  // RENDER
  // =============================================================================

  if (productsLoading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  const termOptions = selectedProduct
    ? Array.from(
        {
          length:
            Math.floor((selectedProduct.maxTermMonths - selectedProduct.minTermMonths) / 12) + 1,
        },
        (_, i) => selectedProduct.minTermMonths + i * 12,
      ).filter((t) => t <= selectedProduct.maxTermMonths)
    : [12, 24, 36, 48, 60, 72, 84];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("loanApplication.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("loanApplication.subtitle")}</p>
        </div>

        {/* Progress */}
        {step !== "submitted" && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>{t(STEP_LABEL_KEYS[step])}</span>
              <span>
                {t("loanApplication.stepOf", {
                  current: stepIndex + 1,
                  total: STEP_ORDER.length - 1,
                })}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {step === "select-product" && (
          <SelectProductStep
            products={products}
            form={form}
            fieldError={fieldError}
            updateField={updateField}
            onNext={handleNextFromProduct}
          />
        )}

        {step === "personal-info" && (
          <PersonalInfoStep
            form={form}
            fieldError={fieldError}
            updateField={updateField}
            onNext={handleNextFromPersonal}
            onBack={goBack}
          />
        )}

        {step === "employment" && (
          <EmploymentStep
            form={form}
            fieldError={fieldError}
            updateField={updateField}
            onNext={handleNextFromEmployment}
            onBack={goBack}
          />
        )}

        {step === "loan-details" && (
          <LoanDetailsStep
            form={form}
            selectedProduct={selectedProduct}
            termOptions={termOptions}
            fieldError={fieldError}
            updateField={updateField}
            onNext={handleNextFromLoanDetails}
            onBack={goBack}
          />
        )}

        {step === "documents" && (
          <DocumentsStep
            selectedLoanType={form.selectedLoanType}
            documents={documents}
            onDocumentUpload={handleDocumentUpload}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === "review" && (
          <ReviewStep
            form={form}
            selectedProduct={selectedProduct}
            documents={documents}
            errors={errors}
            isSubmitting={createApplication.isPending}
            onSubmit={handleSubmit}
            onBack={goBack}
          />
        )}

        {step === "submitted" && <SubmittedStep applicationId={applicationId} />}
      </div>
    </AppShell>
  );
}
