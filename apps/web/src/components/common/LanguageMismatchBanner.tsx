import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageDir } from "@/lib/i18n";

const DISMISSED_KEY = "app-lang-mismatch-dismissed";

export function LanguageMismatchBanner() {
  const { t, i18n } = useTranslation("common");
  const [deviceLang, setDeviceLang] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const navLang = navigator.language?.slice(0, 2);
    if (!navLang || navLang === i18n.language?.slice(0, 2)) return;

    const supported = SUPPORTED_LANGUAGES.find(
      (l) => l.code === navLang || l.code.startsWith(navLang),
    );
    if (!supported) return;

    setDeviceLang(supported.code);
    setDismissed(false);
  }, [i18n.language]);

  if (dismissed || !deviceLang) return null;

  const deviceLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === deviceLang)?.label ?? deviceLang;

  const handleSwitch = () => {
    i18n.changeLanguage(deviceLang);
    const dir = getLanguageDir(deviceLang);
    document.documentElement.lang = deviceLang;
    document.documentElement.dir = dir;
    setDismissed(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center justify-between">
      <span>
        {t("languageMismatch.message", {
          language: deviceLangLabel,
          defaultValue: `Your device language is {{language}}. Switch?`,
        })}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={handleSwitch} className="font-medium underline hover:no-underline">
          {t("languageMismatch.switch", { defaultValue: "Switch" })}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
          aria-label={t("languageMismatch.dismiss", { defaultValue: "Dismiss" })}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
