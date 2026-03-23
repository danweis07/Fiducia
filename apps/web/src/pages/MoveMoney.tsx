import { Send, Receipt, Camera, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

// Note: moveMoneyOptions contains display labels defined outside the component.
// These could be extracted to i18n later but are left as-is per instructions.
const moveMoneyOptions = [
  {
    id: "transfer",
    icon: Send,
    labelKey: "moveMoney.options.transfer.label",
    descriptionKey: "moveMoney.options.transfer.description",
    path: "/transfer",
  },
  {
    id: "bills",
    icon: Receipt,
    labelKey: "moveMoney.options.bills.label",
    descriptionKey: "moveMoney.options.bills.description",
    path: "/bills",
  },
  {
    id: "deposit",
    icon: Camera,
    labelKey: "moveMoney.options.deposit.label",
    descriptionKey: "moveMoney.options.deposit.description",
    path: "/deposit",
  },
];

export default function MoveMoney() {
  const { t } = useTranslation("banking");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("moveMoney.title")}</h1>
        <p className="text-muted-foreground">{t("moveMoney.subtitle")}</p>
      </div>

      <div className="grid gap-4">
        {moveMoneyOptions.map((option) => (
          <Link key={option.id} to={option.path}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="rounded-full bg-primary/10 p-3">
                  <option.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{t(option.labelKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(option.descriptionKey)}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
