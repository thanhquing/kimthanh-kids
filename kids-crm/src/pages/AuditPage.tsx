import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { crm, type AuditLog } from "@/api/crm";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { usePaged } from "@/hooks/usePaged";
import { useT } from "@/i18n";
import { fetchAllPages } from "@/lib/fetchAll";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

const PREFIXES = ["", "member", "invoice", "student"];

function actionBadge(action: string): string {
  if (/(cancel|delete)/.test(action)) return "b-red";
  if (/(payment|create|activate)/.test(action)) return action.includes("member") ? "b-blue" : "b-green";
  if (/deactivate/.test(action)) return "b-amber";
  return "b-slate";
}

function metaText(m?: Record<string, unknown> | null): string {
  if (!m || Object.keys(m).length === 0) return "—";
  return Object.entries(m)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export function AuditPage() {
  const { t } = useT();
  const [prefix, setPrefix] = useState("");

  const logs = usePaged(["audit-logs"], (pg) => crm.audit.page(pg), { pageSize: 50 });
  const members = useQuery({
    queryKey: ["members", "all-for-audit"],
    queryFn: () => fetchAllPages((pg) => crm.members.page(pg)),
  });

  const actorName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members.data ?? []) map.set(m.user.id, m.user.fullName);
    return map;
  }, [members.data]);

  const filtered = useMemo(
    () => logs.items.filter((l: AuditLog) => !prefix || l.action.startsWith(prefix)),
    [logs.items, prefix],
  );

  return (
    <>
      <PageHeader title={t("audit.title")} section={t("audit.section")} />
      <main className="p-6">
        <div className="flex gap-2 mb-4 flex-wrap">
          {PREFIXES.map((p) => (
            <button key={p || "all"} className={cn("chip", prefix === p && "active")} onClick={() => setPrefix(p)}>
              {p ? `${p}.*` : t("audit.filterAll")}
            </button>
          ))}
        </div>

        {logs.isLoading ? (
          <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-sm text-muted">{t("audit.empty")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="w-40">{t("audit.colTime")}</th>
                <th>{t("audit.colAction")}</th>
                <th>{t("audit.colActor")}</th>
                <th>{t("audit.colTarget")}</th>
                <th>{t("audit.colDetails")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="text-xs text-slate-500">{formatDateTime(l.createdAt)}</td>
                  <td>
                    <span className={`badge ${actionBadge(l.action)} font-mono`}>{l.action}</span>
                  </td>
                  <td className="text-sm">
                    {(l.actorId && actorName.get(l.actorId)) ||
                      (l.actorType === "PLATFORM" ? t("audit.system") : "—")}
                  </td>
                  <td className="text-sm">
                    {l.targetType ? (
                      <span>
                        {l.targetType}
                        {l.targetId ? <span className="text-xs text-slate-400"> · {l.targetId.slice(0, 8)}</span> : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-xs text-slate-500 max-w-xs truncate">{metaText(l.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={logs.page}
          pages={logs.pages}
          total={logs.total}
          onPage={logs.setPage}
          busy={logs.isFetching}
        />
      </main>
    </>
  );
}
