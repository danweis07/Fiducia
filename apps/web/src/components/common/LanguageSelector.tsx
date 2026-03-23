import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getLanguageDir, getLanguagesByRegion, REGION_LABELS } from "@/lib/i18n";
import { useAuth } from "@/contexts/TenantContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

/** Map TenantRegion to i18n language region for sorting */
const TENANT_TO_LANG_REGION: Record<string, string> = {
  us: "americas",
  latam: "americas",
  uk: "europe",
  eu: "europe",
  apac: "asia",
  mena: "africa",
  africa: "africa",
};

/**
 * Dropdown to select the application language.
 * Languages are grouped by region, with the tenant's region shown first.
 * Updates i18n, localStorage, and the document's lang/dir attributes.
 */
export function LanguageSelector() {
  const { i18n, t } = useTranslation("settings");
  const { tenant } = useAuth();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
    document.documentElement.lang = value;
    document.documentElement.dir = getLanguageDir(value);
  };

  const regionMap = getLanguagesByRegion();

  // Sort regions so the tenant's region appears first
  const sortedRegions = useMemo(() => {
    const entries = Array.from(regionMap.entries());
    const tenantLangRegion = tenant?.region ? TENANT_TO_LANG_REGION[tenant.region] : undefined;
    if (!tenantLangRegion) return entries;
    return entries.sort((a, b) => {
      const aMatch = a[0] === tenantLangRegion ? -1 : 0;
      const bMatch = b[0] === tenantLangRegion ? -1 : 0;
      return aMatch - bMatch;
    });
  }, [regionMap, tenant?.region]);

  return (
    <div className="space-y-2">
      <label htmlFor="language-select" className="text-sm font-medium flex items-center gap-2">
        <Globe className="w-4 h-4" aria-hidden="true" />
        {t("settings.language")}
      </label>
      <Select value={i18n.language} onValueChange={handleChange}>
        <SelectTrigger
          id="language-select"
          className="w-full min-h-[44px]"
          aria-label={t("a11y.selectLanguage", { ns: "common" })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortedRegions.map(([region, languages]) => (
            <SelectGroup key={region}>
              <SelectLabel>{REGION_LABELS[region] ?? region}</SelectLabel>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="min-h-[44px]">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
    </div>
  );
}
