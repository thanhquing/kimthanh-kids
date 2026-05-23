import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

export default async function AdminDashboard({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('dashboard');
  const metrics: Array<{ key: string; value: string }> = [
    { key: 'students', value: '—' },
    { key: 'presentToday', value: '—' },
    { key: 'pendingInvoices', value: '—' },
    { key: 'announcements', value: '—' },
  ];

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('welcome', { name: 'Admin' })}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t('today')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.key}
            className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              {t(`metrics.${m.key}` as 'metrics.students')}
            </div>
            <div className="mt-2 text-2xl font-semibold">{m.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
