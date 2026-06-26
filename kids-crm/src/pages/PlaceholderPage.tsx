import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useT, type TKey } from "@/i18n";

export function PlaceholderPage({
  titleKey,
  sectionKey,
  icon: Icon,
  descKey,
  endpoints,
}: {
  titleKey: TKey;
  sectionKey: TKey;
  icon: LucideIcon;
  descKey: TKey;
  endpoints: string[];
}) {
  const { t } = useT();
  return (
    <>
      <PageHeader title={t(titleKey)} section={t(sectionKey)} />
      <main className="p-6">
        <div className="card p-6 max-w-3xl">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-orange-50 text-[color:var(--primary)] grid place-items-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-800 mb-1">{t("placeholder.hasRoute")}</div>
              <p className="text-sm text-slate-500">{t(descKey)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {endpoints.map((e) => (
                  <span key={e} className="badge b-slate font-mono">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

