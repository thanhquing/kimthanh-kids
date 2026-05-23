import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

export default async function FinanceDashboard({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('nav');
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('finance')}</h1>
      <p className="mt-2 text-sm text-neutral-500">TODO: invoices, payments, reconciliation.</p>
    </section>
  );
}
