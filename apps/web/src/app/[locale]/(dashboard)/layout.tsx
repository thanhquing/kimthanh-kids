import Link from 'next/link';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { LanguageSwitcher } from '@/components/language-switcher';

export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('nav');

  const links: Array<[string, string]> = [
    ['/admin', t('dashboard')],
    ['/admin/students', t('students')],
    ['/admin/classes', t('classes')],
    ['/admin/attendance', t('attendance')],
    ['/admin/reports', t('reports')],
    ['/admin/announcements', t('announcements')],
    ['/finance', t('finance')],
    ['/nurse', t('health')],
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col border-r border-neutral-200 bg-white p-4 md:flex">
        <div className="mb-6 text-lg font-semibold text-brand-600">KimThanh</div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href as any}
              className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {label}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
