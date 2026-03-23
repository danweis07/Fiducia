import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function SubmittedStep({ applicationId }: { applicationId: string | null }) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardContent className="pt-8 pb-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">{t("loanApplication.applicationSubmitted")}</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {t("loanApplication.applicationSubmittedDesc")}
        </p>
        {applicationId && (
          <div className="bg-muted rounded-lg p-3 inline-block">
            <p className="text-sm text-muted-foreground">{t("loanApplication.applicationId")}</p>
            <p className="font-mono font-medium">{applicationId}</p>
          </div>
        )}
        <div className="pt-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            {t("loanApplication.returnToDashboard")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
