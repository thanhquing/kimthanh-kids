import { Locale } from '@kimthanh/shared-types';

export const locales: ReadonlyArray<Locale> = [Locale.VI, Locale.EN];
export const defaultLocale: Locale = Locale.VI;

export const isValidLocale = (value: string): value is Locale =>
  (locales as ReadonlyArray<string>).includes(value);
