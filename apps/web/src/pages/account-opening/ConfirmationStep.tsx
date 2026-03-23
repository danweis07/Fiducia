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
import { CheckCircle2, ArrowRight } from "lucide-react";
import { productTypeIcon } from "./constants";

export function ConfirmationStep({
  createdAccounts,
}: {
  createdAccounts: Array<{ accountId: string; accountNumberMasked: string; type: string }>;
}) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">{t("accountOpening.accountCreated")}</CardTitle>
        <CardDescription>{t("accountOpening.accountCreatedDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdAccounts.length > 0 && (
          <div className="space-y-3">
            {createdAccounts.map((acct) => {
              const Icon = productTypeIcon(acct.type);
              return (
                <div
                  key={acct.accountId}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <p className="font-medium capitalize">
                        {t("accountOpening.accountType", { type: acct.type.replace(/_/g, " ") })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("accountOpening.accountLabel")}: {acct.accountNumberMasked}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {t("accountOpening.active")}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>{t("accountOpening.confirmationMessage")}</p>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button onClick={() => window.location.assign("/dashboard")}>
          {t("accountOpening.goToDashboard")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
