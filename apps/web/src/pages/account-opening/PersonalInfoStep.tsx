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
import { ArrowRight, ArrowLeft } from "lucide-react";
import { SecureInput } from "@/components/common/SecureInput";
import type { FormData } from "./constants";
import { US_STATES } from "./constants";

export function PersonalInfoStep({
  form,
  errors,
  updateField,
  onNext,
  onBack,
}: {
  form: FormData;
  errors: Record<string, string>;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountOpening.personalInfo")}</CardTitle>
        <CardDescription>{t("accountOpening.personalInfoDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("accountOpening.firstName")}</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="John"
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t("accountOpening.lastName")}</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="Doe"
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>

        {/* Contact */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">{t("accountOpening.emailAddress")}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="john.doe@example.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("accountOpening.phoneNumber")}</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
        </div>

        {/* DOB + SSN */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">{t("accountOpening.dateOfBirth")}</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
            />
            {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
          </div>
          <div className="space-y-2">
            <SecureInput
              label={t("accountOpening.ssn")}
              id="ssn"
              value={form.ssn}
              onChange={(val) => updateField("ssn", val)}
              placeholder="123-45-6789"
              maxLength={11}
            />
            {errors.ssn && <p className="text-xs text-destructive">{errors.ssn}</p>}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t("accountOpening.mailingAddress")}</h3>
          <div className="space-y-2">
            <Label htmlFor="addressLine1">{t("accountOpening.streetAddress")}</Label>
            <Input
              id="addressLine1"
              value={form.addressLine1}
              onChange={(e) => updateField("addressLine1", e.target.value)}
              placeholder="123 Main St"
            />
            {errors.addressLine1 && (
              <p className="text-xs text-destructive">{errors.addressLine1}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">{t("accountOpening.aptSuiteUnit")}</Label>
            <Input
              id="addressLine2"
              value={form.addressLine2}
              onChange={(e) => updateField("addressLine2", e.target.value)}
              placeholder="Apt 4B"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">{t("accountOpening.city")}</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Springfield"
              />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("accountOpening.state")}</Label>
              <Select value={form.state} onValueChange={(val) => updateField("state", val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("accountOpening.selectState")} />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">{t("accountOpening.zipCode")}</Label>
              <Input
                id="zip"
                value={form.zip}
                onChange={(e) => updateField("zip", e.target.value)}
                placeholder="62704"
                maxLength={10}
              />
              {errors.zip && <p className="text-xs text-destructive">{errors.zip}</p>}
            </div>
          </div>
        </div>

        {/* Citizenship + Employment */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("accountOpening.citizenshipStatus")}</Label>
            <Select
              value={form.citizenship}
              onValueChange={(val) => updateField("citizenship", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("accountOpening.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us_citizen">{t("accountOpening.usCitizen")}</SelectItem>
                <SelectItem value="permanent_resident">
                  {t("accountOpening.permanentResident")}
                </SelectItem>
                <SelectItem value="non_resident">{t("accountOpening.nonResident")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.citizenship && <p className="text-xs text-destructive">{errors.citizenship}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("accountOpening.employmentStatus")}</Label>
            <Select
              value={form.employmentStatus}
              onValueChange={(val) => updateField("employmentStatus", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("accountOpening.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employed">{t("accountOpening.employed")}</SelectItem>
                <SelectItem value="self_employed">{t("accountOpening.selfEmployed")}</SelectItem>
                <SelectItem value="retired">{t("accountOpening.retired")}</SelectItem>
                <SelectItem value="student">{t("accountOpening.student")}</SelectItem>
                <SelectItem value="unemployed">{t("accountOpening.unemployed")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.employmentStatus && (
              <p className="text-xs text-destructive">{errors.employmentStatus}</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("accountOpening.back")}
        </Button>
        <Button onClick={onNext}>
          {t("accountOpening.continue")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
