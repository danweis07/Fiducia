/**
 * Backend i18n types for edge functions.
 */

export type SupportedLocale =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'nl' | 'pl' | 'ro' | 'el' | 'cs' | 'sv' | 'hu'
  | 'pt' | 'pt-BR'
  | 'zh-CN' | 'zh-TW' | 'ko' | 'vi' | 'tl'
  | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa'
  | 'ar'
  | 'ha' | 'yo' | 'ig' | 'pcm';

export interface ErrorTranslation {
  title: string;
  message: string;
  action: string;
}

export type ErrorTranslations = Record<string, ErrorTranslation>;
