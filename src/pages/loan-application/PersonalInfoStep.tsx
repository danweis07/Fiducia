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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft, User } from "lucide-react";
import type { FormData } from "./constants";
import { US_STATES } from "./constants";

export function PersonalInfoStep({
  form,
  fieldError,
  updateField,
  onNext,
  onBack,
}: {
  form: FormData;
  fieldError: (field: string) => React.ReactNode;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" /> {t("loanApplication.personalInfo")}
        </CardTitle>
        <CardDescription>
          {t("loanApplication.personalInfoDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">{t("loanApplication.firstName")}</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
            />
            {fieldError("firstName")}
          </div>
          <div>
            <Label htmlFor="lastName">{t("loanApplication.lastName")}</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
            />
            {fieldError("lastName")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">{t("loanApplication.email")}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            {fieldError("email")}
          </div>
          <div>
            <Label htmlFor="phone">{t("loanApplication.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="(555) 555-5555"
            />
            {fieldError("phone")}
          </div>
        </div>

        <div>
          <Label htmlFor="addressLine1">{t("loanApplication.streetAddress")}</Label>
          <Input
            id="addressLine1"
            value={form.addressLine1}
            onChange={(e) => updateField("addressLine1", e.target.value)}
          />
          {fieldError("addressLine1")}
        </div>

        <div>
          <Label htmlFor="addressLine2">{t("loanApplication.aptSuite")}</Label>
          <Input
            id="addressLine2"
            value={form.addressLine2}
            onChange={(e) => updateField("addressLine2", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">{t("loanApplication.city")}</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            {fieldError("city")}
          </div>
          <div>
            <Label htmlFor="state">{t("loanApplication.state")}</Label>
            <Select value={form.state} onValueChange={(v) => updateField("state", v)}>
              <SelectTrigger id="state">
                <SelectValue placeholder={t("loanApplication.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("state")}
          </div>
          <div>
            <Label htmlFor="zip">{t("loanApplication.zipCode")}</Label>
            <Input
              id="zip"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
              placeholder="12345"
            />
            {fieldError("zip")}
          </div>
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
