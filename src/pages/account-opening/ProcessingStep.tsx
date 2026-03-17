import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function ProcessingStep({
  applicationStatus,
  onStartOver,
}: {
  applicationStatus: string | null;
  onStartOver: () => void;
}) {
  const { t } = useTranslation("banking");

  const isProcessing = !applicationStatus || applicationStatus === "kyc_pending";
  const isApproved = applicationStatus === "kyc_approved";
  const isDenied = applicationStatus === "kyc_denied";
  const isReview = applicationStatus === "kyc_review";
  const isError = applicationStatus === "error";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {isProcessing
            ? t("accountOpening.verifyingIdentity")
            : isApproved
              ? t("accountOpening.identityVerified")
              : isDenied
                ? t("accountOpening.verificationUnsuccessful")
                : isReview
                  ? t("accountOpening.additionalReviewRequired")
                  : t("accountOpening.somethingWentWrong")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4 py-8">
        {isProcessing && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {t("accountOpening.verifyingMessage")}
            </p>
          </>
        )}
        {isApproved && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-muted-foreground">
              {t("accountOpening.identityVerifiedMessage")}
            </p>
          </>
        )}
        {isDenied && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-muted-foreground">
              {t("accountOpening.verificationDeniedMessage")}
            </p>
          </>
        )}
        {isReview && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-muted-foreground">
              {t("accountOpening.additionalReviewMessage")}
            </p>
          </>
        )}
        {isError && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-muted-foreground">
              {t("accountOpening.processingError")}
            </p>
          </>
        )}
      </CardContent>
      {(isDenied || isReview || isError) && (
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={onStartOver}>
            {t("accountOpening.startOver")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
