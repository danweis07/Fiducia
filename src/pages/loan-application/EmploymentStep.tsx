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
import { ArrowRight, ArrowLeft, Building2 } from "lucide-react";
import type { FormData } from "./constants";
import { EMPLOYMENT_STATUS_KEYS } from "./constants";

export function EmploymentStep({
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
          <Building2 className="h-5 w-5" /> {t("loanApplication.employmentAndIncome")}
        </CardTitle>
        <CardDescription>
          {t("loanApplication.employmentDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="employmentStatus">{t("loanApplication.employmentStatus")}</Label>
          <Select
            value={form.employmentStatus}
            onValueChange={(v) => updateField("employmentStatus", v)}
          >
            <SelectTrigger id="employmentStatus">
              <SelectValue placeholder={t("loanApplication.selectStatus")} />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_STATUS_KEYS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("employmentStatus")}
        </div>

        {(form.employmentStatus === "employed" ||
          form.employmentStatus === "self_employed") && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employerName">{t("loanApplication.employerName")}</Label>
              <Input
                id="employerName"
                value={form.employerName}
                onChange={(e) => updateField("employerName", e.target.value)}
              />
              {fieldError("employerName")}
            </div>
            <div>
              <Label htmlFor="yearsEmployed">{t("loanApplication.yearsAtCurrentJob")}</Label>
              <Input
                id="yearsEmployed"
                type="number"
                min="0"
                value={form.yearsEmployed}
                onChange={(e) => updateField("yearsEmployed", e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="annualIncome">{t("loanApplication.annualIncome")}</Label>
          <Input
            id="annualIncome"
            type="number"
            min="0"
            step="1000"
            value={form.annualIncomeDollars}
            onChange={(e) => updateField("annualIncomeDollars", e.target.value)}
            placeholder="50000"
          />
          {fieldError("annualIncomeDollars")}
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
