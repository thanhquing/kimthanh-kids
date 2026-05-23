import { Locale } from '@kimthanh/shared-types';

export const formatCurrency = (
  amount: number,
  currency = 'VND',
  locale: Locale = Locale.VI,
): string =>
  new Intl.NumberFormat(locale === Locale.VI ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount);

export const formatNumber = (value: number, locale: Locale = Locale.VI): string =>
  new Intl.NumberFormat(locale === Locale.VI ? 'vi-VN' : 'en-US').format(value);

export const truncate = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

export const initialsFromName = (fullName: string): string =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
