import { differenceInYears, format, parseISO } from 'date-fns';

import { Locale } from '@kimthanh/shared-types';

export const formatDate = (value: string | Date, locale: Locale = Locale.VI): string => {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, locale === Locale.VI ? 'dd/MM/yyyy' : 'yyyy-MM-dd');
};

export const formatDateTime = (value: string | Date, locale: Locale = Locale.VI): string => {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, locale === Locale.VI ? 'dd/MM/yyyy HH:mm' : 'yyyy-MM-dd HH:mm');
};

export const calculateAge = (dateOfBirth: string | Date): number => {
  const date = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  return differenceInYears(new Date(), date);
};

export const toISODate = (value: Date = new Date()): string =>
  value.toISOString().slice(0, 10);
