import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { Locale } from '@kimthanh/shared-types';

import en from '../../locales/en/common.json';
import vi from '../../locales/vi/common.json';

const deviceLang = getLocales()[0]?.languageCode ?? 'vi';
const lng = (Object.values(Locale) as string[]).includes(deviceLang) ? deviceLang : Locale.VI;

void i18n.use(initReactI18next).init({
  lng,
  fallbackLng: Locale.VI,
  resources: {
    vi: { common: vi },
    en: { common: en },
  },
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
