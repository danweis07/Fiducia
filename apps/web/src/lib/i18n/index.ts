import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Eagerly load English (fallback) namespace bundles
import enCommon from "./locales/en/common.json";
import enBanking from "./locales/en/banking.json";
import enSettings from "./locales/en/settings.json";
import enErrors from "./locales/en/errors.json";
import enAdmin from "./locales/en/admin.json";
import enPublic from "./locales/en/public.json";

export const NAMESPACES = ["common", "banking", "settings", "errors", "admin", "public"] as const;
export type TranslationNamespace = (typeof NAMESPACES)[number];

export const SUPPORTED_LANGUAGES = [
  // Americas
  { code: "en", label: "English", dir: "ltr" as const, region: "americas" },
  { code: "es", label: "Español", dir: "ltr" as const, region: "americas" },
  { code: "pt-BR", label: "Português (Brasil)", dir: "ltr" as const, region: "americas" },
  // Europe
  { code: "fr", label: "Français", dir: "ltr" as const, region: "europe" },
  { code: "de", label: "Deutsch", dir: "ltr" as const, region: "europe" },
  { code: "it", label: "Italiano", dir: "ltr" as const, region: "europe" },
  { code: "pt", label: "Português (Portugal)", dir: "ltr" as const, region: "europe" },
  { code: "nl", label: "Nederlands", dir: "ltr" as const, region: "europe" },
  { code: "pl", label: "Polski", dir: "ltr" as const, region: "europe" },
  { code: "ro", label: "Română", dir: "ltr" as const, region: "europe" },
  { code: "el", label: "Ελληνικά", dir: "ltr" as const, region: "europe" },
  { code: "cs", label: "Čeština", dir: "ltr" as const, region: "europe" },
  { code: "sv", label: "Svenska", dir: "ltr" as const, region: "europe" },
  { code: "hu", label: "Magyar", dir: "ltr" as const, region: "europe" },
  // Asia
  { code: "zh-CN", label: "简体中文", dir: "ltr" as const, region: "asia" },
  { code: "zh-TW", label: "繁體中文", dir: "ltr" as const, region: "asia" },
  { code: "ko", label: "한국어", dir: "ltr" as const, region: "asia" },
  { code: "vi", label: "Tiếng Việt", dir: "ltr" as const, region: "asia" },
  { code: "tl", label: "Filipino", dir: "ltr" as const, region: "asia" },
  { code: "hi", label: "हिन्दी", dir: "ltr" as const, region: "asia" },
  { code: "bn", label: "বাংলা", dir: "ltr" as const, region: "asia" },
  { code: "ta", label: "தமிழ்", dir: "ltr" as const, region: "asia" },
  { code: "te", label: "తెలుగు", dir: "ltr" as const, region: "asia" },
  { code: "mr", label: "मराठी", dir: "ltr" as const, region: "asia" },
  { code: "gu", label: "ગુજરાતી", dir: "ltr" as const, region: "asia" },
  { code: "kn", label: "ಕನ್ನಡ", dir: "ltr" as const, region: "asia" },
  { code: "ml", label: "മലയാളം", dir: "ltr" as const, region: "asia" },
  { code: "pa", label: "ਪੰਜਾਬੀ", dir: "ltr" as const, region: "asia" },
  // Middle East & Africa
  { code: "ar", label: "العربية", dir: "rtl" as const, region: "africa" },
  { code: "ha", label: "Hausa", dir: "ltr" as const, region: "africa" },
  { code: "yo", label: "Yorùbá", dir: "ltr" as const, region: "africa" },
  { code: "ig", label: "Igbo", dir: "ltr" as const, region: "africa" },
  { code: "pcm", label: "Naijá (Pidgin)", dir: "ltr" as const, region: "africa" },
  { code: "sw", label: "Kiswahili", dir: "ltr" as const, region: "africa" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export type LanguageRegion = (typeof SUPPORTED_LANGUAGES)[number]["region"];

export function getLanguageDir(lang: string): "ltr" | "rtl" {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  return found?.dir ?? "ltr";
}

export function getLanguageRegion(lang: string): LanguageRegion | undefined {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  return found?.region;
}

export function getLanguagesByRegion() {
  const regions = new Map<string, (typeof SUPPORTED_LANGUAGES)[number][]>();
  for (const lang of SUPPORTED_LANGUAGES) {
    const list = regions.get(lang.region) ?? [];
    list.push(lang);
    regions.set(lang.region, list);
  }
  return regions;
}

/** Region display labels */
export const REGION_LABELS: Record<string, string> = {
  americas: "Americas",
  europe: "Europe",
  asia: "Asia & Pacific",
  africa: "Middle East & Africa",
};

/**
 * Lazily load namespace translations for a non-English language.
 * Returns the namespace JSON module.
 */
const localeLoaders: Record<string, () => Promise<Record<string, unknown>>> = {};

// Build lazy loaders for all non-English locales
for (const lang of SUPPORTED_LANGUAGES) {
  if (lang.code === "en") continue;
  for (const ns of NAMESPACES) {
    const key = `${lang.code}/${ns}`;
    localeLoaders[key] = () =>
      import(`./locales/${lang.code}/${ns}.json`).then((m) => m.default ?? m);
  }
}

/**
 * Load all namespaces for a given language into i18next.
 * Called on language change.
 */
export async function loadLanguageNamespaces(lang: string): Promise<void> {
  if (lang === "en") return; // Already bundled
  const loads = NAMESPACES.map(async (ns) => {
    const key = `${lang}/${ns}`;
    const loader = localeLoaders[key];
    if (!loader) return;
    try {
      const data = await loader();
      if (data && Object.keys(data).length > 0) {
        i18n.addResourceBundle(lang, ns, data, true, true);
      }
    } catch {
      // Namespace not yet translated — falls back to English
    }
  });
  await Promise.all(loads);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)

  .init({
    resources: {
      en: {
        common: enCommon,
        banking: enBanking,
        settings: enSettings,
        errors: enErrors,
        admin: enAdmin,
        public: enPublic,
      },
    },
    ns: NAMESPACES as unknown as string[],
    defaultNs: "common",
    fallbackNs: "common",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "app-language",
    },
  } as Parameters<typeof i18n.init>[0]);

// When language changes, lazy-load its translations
i18n.on("languageChanged", (lang: string) => {
  loadLanguageNamespaces(lang);
});

// If the detected language isn't English, load its translations now
if (i18n.language && i18n.language !== "en") {
  loadLanguageNamespaces(i18n.language);
}

export default i18n;
