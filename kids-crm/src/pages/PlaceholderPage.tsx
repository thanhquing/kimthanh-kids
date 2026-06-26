import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export function PlaceholderPage({
  title,
  section,
  icon: Icon,
  description,
  endpoints,
}: {
  title: string;
  section: string;
  icon: LucideIcon;
  description: string;
  endpoints: string[];
}) {
  return (
    <>
      <PageHeader title={title} section={section} />
      <main className="p-6">
        <div className="card p-6 max-w-3xl">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-orange-50 text-[color:var(--primary)] grid place-items-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-800 mb-1">Đã có route CRM</div>
              <p className="text-sm text-slate-500">{description}</p>
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

