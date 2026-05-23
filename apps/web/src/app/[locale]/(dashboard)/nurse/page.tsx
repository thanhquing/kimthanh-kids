import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

export default async function NurseDashboard({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('nav');
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('health')}</h1>
      <p className="mt-2 text-sm text-neutral-500">TODO: medicine requests, health records, incidents.</p>
    </section>
  );
}
