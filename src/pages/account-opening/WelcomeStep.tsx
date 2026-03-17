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
  User,
  CreditCard,
  DollarSign,
  ArrowRight,
  Building2,
} from "lucide-react";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t("accountOpening.title")}</CardTitle>
        <CardDescription className="text-base">
          {t("accountOpening.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="mx-auto grid max-w-lg gap-3 text-left text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{t("accountOpening.welcomeStep1")}</span>
          </div>
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{t("accountOpening.welcomeStep2")}</span>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{t("accountOpening.welcomeStep3")}</span>
          </div>
          <div className="flex items-start gap-3">
            <DollarSign className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{t("accountOpening.welcomeStep4")}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button size="lg" onClick={onNext}>
          {t("accountOpening.openAnAccount")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
