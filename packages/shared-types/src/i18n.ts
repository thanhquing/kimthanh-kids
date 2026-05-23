import { Locale } from './enums';

export const SUPPORTED_LOCALES: Locale[] = [Locale.VI, Locale.EN];
export const DEFAULT_LOCALE: Locale = Locale.VI;

export type TranslationKey = string;

/** Generic shape used by next-intl + i18next JSON files. */
export type TranslationNamespace = Record<string, string | Record<string, unknown>>;
