import { useState, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { Progress } from "@/components/ui/progress";
import {
  useAccountOpeningConfig,
  useCreateApplication,
  useSelectProducts,
  useSubmitFunding,
  useCompleteApplication,
} from "@/hooks/useAccountOpening";
import { isValidEmail, isValidUSPhone } from "@/lib/common/validators";
import {
  STEP_ORDER,
  STEP_LABEL_KEYS,
  INITIAL_FORM,
  WelcomeStep,
  ProductsStep,
  PersonalInfoStep,
  ReviewStep,
  ProcessingStep,
  FundingStep,
  ConfirmationStep,
} from "./account-opening";
import type { StepId, FormData } from "./account-opening";
import type { ProductConfig } from "./account-opening/constants";

// =============================================================================
// COMPONENT
// =============================================================================

export default function AccountOpening() {
  const { t } = useTranslation('banking');
  const [step, setStep] = useState<StepId>("welcome");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Application state returned from the backend
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [createdAccounts, setCreatedAccounts] = useState<
    Array<{ accountId: string; accountNumberMasked: string; type: string }>
  >([]);

  // Hooks
  const { data: configData, isLoading: configLoading } = useAccountOpeningConfig();
  const createApplication = useCreateApplication();
  const selectProducts = useSelectProducts();
  const submitFunding = useSubmitFunding();
  const completeApplication = useCompleteApplication();

  const config = configData as
    | {
        products: ProductConfig[];
        allowedFundingMethods: string[];
      }
    | undefined;

  const products = useMemo(() => config?.products?.filter((p) => p.isAvailable) ?? [], [config]);

  // Step index for progress
  const stepIndex = STEP_ORDER.indexOf(step);
  const progressPercent = ((stepIndex + 1) / STEP_ORDER.length) * 100;

  // =============================================================================
  // FORM UPDATER
  // =============================================================================

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  // =============================================================================
  // VALIDATION
  // =============================================================================

  const validateProducts = useCallback((): boolean => {
    if (form.selectedProductIds.length === 0) {
      setErrors({ selectedProductIds: "Please select at least one product" });
      return false;
    }
    setErrors({});
    return true;
  }, [form.selectedProductIds]);

  const validatePersonal = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!isValidEmail(form.email)) {
      errs.email = "Invalid email address";
    }
    if (!form.phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (!isValidUSPhone(form.phone)) {
      errs.phone = "Invalid US phone number";
    }
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    if (!form.ssn.trim()) {
      errs.ssn = "SSN is required";
    } else {
      const ssnDigits = form.ssn.replace(/\D/g, "");
      if (ssnDigits.length !== 9) errs.ssn = "SSN must be 9 digits";
    }
    if (!form.addressLine1.trim()) errs.addressLine1 = "Street address is required";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.state) errs.state = "State is required";
    if (!form.zip.trim()) {
      errs.zip = "ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(form.zip)) {
      errs.zip = "Invalid ZIP code";
    }
    if (!form.citizenship) errs.citizenship = "Citizenship status is required";
    if (!form.employmentStatus) errs.employmentStatus = "Employment status is required";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const validateFunding = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!form.fundingMethod) errs.fundingMethod = "Please select a funding method";
    if (form.fundingMethod && form.fundingMethod !== "none") {
      if (!form.fundingAmountDollars.trim()) {
        errs.fundingAmountDollars = "Amount is required";
      } else {
        const dollars = parseFloat(form.fundingAmountDollars);
        if (isNaN(dollars) || dollars <= 0) {
          errs.fundingAmountDollars = "Please enter a valid amount";
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form.fundingMethod, form.fundingAmountDollars]);

  // =============================================================================
  // NAVIGATION
  // =============================================================================

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
    }
  }, [step]);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) {
      setStep(STEP_ORDER[idx - 1]);
    }
  }, [step]);

  // =============================================================================
  // STEP HANDLERS
  // =============================================================================

  const handleNextFromProducts = useCallback(() => {
    if (validateProducts()) goNext();
  }, [validateProducts, goNext]);

  const handleNextFromPersonal = useCallback(() => {
    if (validatePersonal()) goNext();
  }, [validatePersonal, goNext]);

  const handleSubmitApplication = useCallback(async () => {
    // Move to processing step immediately
    setStep("processing");

    try {
      const result = await createApplication.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        ssn: form.ssn,
        address: {
          line1: form.addressLine1,
          line2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: "US",
        },
        citizenship: form.citizenship,
        employmentStatus: form.employmentStatus,
      });

      const app = result as {
        id: string;
        status: string;
      };

      setApplicationId(app.id);
      setApplicationStatus(app.status);

      if (app.status === "kyc_approved") {
        // Now select products
        await selectProducts.mutateAsync({
          applicationId: app.id,
          productIds: form.selectedProductIds,
        });
        // Move to funding step
        setStep("funding");
      }
      // If denied or review, stay on processing step to show status
    } catch {
      setApplicationStatus("error");
    }
  }, [form, createApplication, selectProducts]);

  const handleSubmitFunding = useCallback(async () => {
    if (!validateFunding()) return;
    if (!applicationId) return;

    try {
      const amountCents =
        form.fundingMethod === "none"
          ? 0
          : Math.round(parseFloat(form.fundingAmountDollars) * 100);

      await submitFunding.mutateAsync({
        applicationId,
        funding: {
          method: form.fundingMethod,
          amountCents,
        },
      });

      // Complete the application
      const result = await completeApplication.mutateAsync(applicationId);
      const app = result as {
        id: string;
        status: string;
        createdAccounts?: Array<{
          accountId: string;
          accountNumberMasked: string;
          type: string;
        }>;
      };

      setApplicationStatus(app.status);
      if (app.createdAccounts) {
        setCreatedAccounts(app.createdAccounts);
      }
      setStep("confirmation");
    } catch {
      setApplicationStatus("error");
    }
  }, [applicationId, form, validateFunding, submitFunding, completeApplication]);

  // =============================================================================
  // MASK SSN FOR REVIEW
  // =============================================================================

  const maskedSSN = useMemo(() => {
    const digits = form.ssn.replace(/\D/g, "");
    if (digits.length < 4) return "***-**-****";
    return `***-**-${digits.slice(-4)}`;
  }, [form.ssn]);

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Progress Bar */}
      {step !== "welcome" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t('accountOpening.stepOf', { current: stepIndex + 1, total: STEP_ORDER.length })}
            </span>
            <span>{t(STEP_LABEL_KEYS[step])}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Current Step */}
      {step === "welcome" && <WelcomeStep onNext={goNext} />}
      {step === "products" && (
        <ProductsStep
          products={products}
          form={form}
          errors={errors}
          configLoading={configLoading}
          updateField={updateField}
          onNext={handleNextFromProducts}
          onBack={goBack}
        />
      )}
      {step === "personal" && (
        <PersonalInfoStep
          form={form}
          errors={errors}
          updateField={updateField}
          onNext={handleNextFromPersonal}
          onBack={goBack}
        />
      )}
      {step === "review" && (
        <ReviewStep
          form={form}
          products={products}
          maskedSSN={maskedSSN}
          isSubmitting={createApplication.isPending}
          onSubmit={handleSubmitApplication}
          onBack={goBack}
        />
      )}
      {step === "processing" && (
        <ProcessingStep
          applicationStatus={applicationStatus}
          onStartOver={() => setStep("welcome")}
        />
      )}
      {step === "funding" && (
        <FundingStep
          form={form}
          errors={errors}
          allowedFundingMethods={config?.allowedFundingMethods ?? ["ach_transfer", "none"]}
          isSubmitting={submitFunding.isPending || completeApplication.isPending}
          updateField={updateField}
          onSubmit={handleSubmitFunding}
          onBack={() => setStep("review")}
        />
      )}
      {step === "confirmation" && (
        <ConfirmationStep createdAccounts={createdAccounts} />
      )}
    </div>
  );
}
