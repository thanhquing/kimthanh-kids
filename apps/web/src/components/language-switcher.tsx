'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { locales } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const segments = pathname.split('/');
    segments[1] = next;
    startTransition(() => router.replace(segments.join('/') as any));
  };

  return (
    <label className="text-sm text-neutral-600">
      <span className="sr-only">{t('languageSwitcher')}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
