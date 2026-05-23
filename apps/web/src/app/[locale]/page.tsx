import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/language-switcher';

export default function MarketingHome({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = useTranslations();
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="text-lg font-semibold text-brand-600">{t('app.name')}</div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="#programs">{t('nav.programs')}</Link>
          <Link href="#contact">{t('nav.contact')}</Link>
          <Link href="/login" className="text-brand-600 font-medium">
            {t('nav.login')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          {t('marketing.hero.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-neutral-600">
          {t('marketing.hero.subtitle')}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="#contact"
            className="rounded-md bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-600"
          >
            {t('marketing.hero.ctaPrimary')}
          </Link>
          <Link
            href="#programs"
            className="rounded-md border border-neutral-300 px-5 py-2.5 font-medium hover:bg-neutral-100"
          >
            {t('marketing.hero.ctaSecondary')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16" id="programs">
        <h2 className="text-2xl font-semibold">{t('marketing.features.title')}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {(['safety', 'curriculum', 'communication'] as const).map((key) => (
            <article key={key} className="rounded-lg border border-neutral-200 bg-white p-6">
              <h3 className="font-semibold text-brand-700">
                {t(`marketing.features.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                {t(`marketing.features.${key}.body`)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
