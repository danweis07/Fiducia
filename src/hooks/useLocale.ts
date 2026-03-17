import { useTranslation } from 'react-i18next';
import { getLanguageDir } from '@/lib/i18n';

/**
 * Hook providing the current locale, text direction, and formatting helpers.
 * Wraps i18next state so components don't need to import i18n directly.
 */
export function useLocale() {
  const { i18n } = useTranslation();

  const locale = i18n.language ?? 'en';
  const dir = getLanguageDir(locale);

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, options).format(value);

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, options);
  };

  return { locale, dir, formatNumber, formatDate };
}
