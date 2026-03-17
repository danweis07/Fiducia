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
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { formatInterestRate } from "@/lib/common/currency";
import type { FormData, ProductConfig } from "./constants";
import { productTypeIcon } from "./constants";

export function ReviewStep({
  form,
  products,
  maskedSSN,
  isSubmitting,
  onSubmit,
  onBack,
}: {
  form: FormData;
  products: ProductConfig[];
  maskedSSN: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");
  const selectedProducts = products.filter((p) =>
    form.selectedProductIds.includes(p.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountOpening.reviewTitle")}</CardTitle>
        <CardDescription>
          {t("accountOpening.reviewDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Products */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {t("accountOpening.selectedProducts")}
          </h3>
          <div className="space-y-2">
            {selectedProducts.map((p) => {
              const Icon = productTypeIcon(p.type);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <span className="text-sm text-primary">
                    {formatInterestRate(p.apyBps)} {t("accountOpening.apy")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personal Info (masked) */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {t("accountOpening.personalInfo")}
          </h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">{t("accountOpening.nameLabel")} </span>
              <span className="font-medium">
                {form.firstName} {form.lastName}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("accountOpening.emailLabel")} </span>
              <span className="font-medium">{form.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("accountOpening.phoneLabel")} </span>
              <span className="font-medium">{form.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("accountOpening.dobLabel")} </span>
              <span className="font-medium">{form.dateOfBirth}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("accountOpening.ssnLabel")} </span>
              <span className="font-medium">{maskedSSN}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("accountOpening.citizenshipLabel")} </span>
              <span className="font-medium capitalize">
                {form.citizenship.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {t("accountOpening.address")}
          </h3>
          <p className="text-sm">
            {form.addressLine1}
            {form.addressLine2 ? `, ${form.addressLine2}` : ""}
            <br />
            {form.city}, {form.state} {form.zip}
          </p>
        </div>

        <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              {t("accountOpening.kycDisclosure")}
            </p>
          </div>
        </div>
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
              {t("accountOpening.submitting")}
            </>
          ) : (
            <>
              {t("accountOpening.submitApplication")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
