import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

import { isValidLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  if (!isValidLocale(locale)) notFound();
  const messages = (
    await import(`../../locales/${locale}/common.json`)
  ).default as any;
  return { messages };
});
