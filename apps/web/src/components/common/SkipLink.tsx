import { useTranslation } from "react-i18next";

/**
 * Accessible skip-to-content link.
 * Hidden by default, visible on focus (keyboard navigation).
 * WCAG 2.4.1 — Bypass Blocks.
 */
export function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  const { t } = useTranslation();

  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:min-w-[44px] focus:min-h-[44px] focus:flex focus:items-center"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
