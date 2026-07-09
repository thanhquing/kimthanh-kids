import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listPickupAuthorizationsPage,
  listPickupLogsPage,
  pickupKeys,
  useCreatePickupLog,
  type PickupAuthorization,
  type PickupEventType,
} from "@/api/pickup";
import { TopBar } from "@/components/mobile/MobileShell";
import { InfoLine, StatusBadge } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/Field";
import { LoadMore } from "@/components/ui/LoadMore";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT, type TKey } from "@/i18n";
import { formatShortDate } from "@/lib/date";
import { useMobileState } from "@/lib/mobileState";

const EVENT_KEY: Record<PickupEventType, TKey> = {
  CHECK_IN: "pickup.checkIn",
  CHECK_OUT: "pickup.checkOut",
};

function guardianLabel(a: PickupAuthorization) {
  return `${a.guardianName} · ${a.guardianPhone}`;
}

export function PickupPage() {
  const { role } = useMobileState();
  const { t, lang } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const studentId = params.get("studentId") ?? undefined;
  const authorizations = useLoadMore(
    pickupKeys.authorizations(studentId),
    (pageParams) => listPickupAuthorizationsPage(studentId, pageParams),
    { enabled: Boolean(studentId) },
  );
  const logs = useLoadMore(
    pickupKeys.logs(studentId),
    (pageParams) => listPickupLogsPage(studentId, pageParams),
    { enabled: Boolean(studentId) },
  );
  const createLog = useCreatePickupLog();
  const [sheet, setSheet] = useState<{ auth: PickupAuthorization; eventType: PickupEventType } | null>(null);
  const [note, setNote] = useState("");
  const activeAuthorizations = authorizations.items;
  const canRecord = role === "teacher";
  const title = t("pickup.title");
  const backTo = role === "teacher" ? "/teacher/class" : "/parent/children";

  const groupedLogs = useMemo(() => logs.items, [logs.items]);

  async function submitLog() {
    if (!sheet) return;
    await createLog.mutateAsync({
      authorizationId: sheet.auth.id,
      eventType: sheet.eventType,
      note: note || undefined,
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: pickupKeys.logs(studentId) }),
      queryClient.invalidateQueries({ queryKey: pickupKeys.authorizations(studentId) }),
    ]);
    toast(t("pickup.logSaved"));
    setSheet(null);
    setNote("");
  }

  return (
    <>
      <TopBar title={title} backTo={backTo} />
      {!studentId ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("pickup.chooseStudent")}</div>
      ) : null}
      {authorizations.isError || logs.isError ? (
        <div className="card mt-3 p-4 text-sm text-red-600">{t("pickup.loadError")}</div>
      ) : null}

      <div className="section-title">{t("pickup.authorized")}</div>
      {authorizations.isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {!authorizations.isLoading && activeAuthorizations.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("pickup.emptyAuthorized")}</div>
      ) : null}
      <div className="space-y-2">
        {activeAuthorizations.map((auth) => (
          <div key={auth.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{auth.guardianName}</div>
                <div className="text-xs text-slate-500">
                  {auth.guardianPhone} · {auth.relationship || t("students.guardianSection")}
                </div>
              </div>
              <StatusBadge status={t("pickup.active")} />
            </div>
            {auth.note ? <div className="mt-2 text-xs text-slate-500">{auth.note}</div> : null}
            {canRecord ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-soft" onClick={() => setSheet({ auth, eventType: "CHECK_IN" })}>
                  {t("pickup.checkIn")}
                </button>
                <button type="button" className="btn-primary" onClick={() => setSheet({ auth, eventType: "CHECK_OUT" })}>
                  {t("pickup.checkOut")}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <LoadMore
        hasMore={!!authorizations.hasNextPage}
        loading={authorizations.isFetchingNextPage}
        onMore={() => void authorizations.fetchNextPage()}
      />

      <div className="section-title">{t("pickup.history")}</div>
      {logs.isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {!logs.isLoading && groupedLogs.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("pickup.emptyHistory")}</div>
      ) : null}
      <div className="space-y-2">
        {groupedLogs.map((log) => (
          <div key={log.id} className="card space-y-2 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t(EVENT_KEY[log.eventType])}</div>
              <StatusBadge status={t(EVENT_KEY[log.eventType])} />
            </div>
            <InfoLine label={t("pickup.guardian")} value={`${log.guardianName} · ${log.guardianPhone ?? "—"}`} />
            <InfoLine label={t("pickup.time")} value={formatShortDate(log.occurredAt, lang)} />
            {log.note ? <InfoLine label={t("reports.note")} value={log.note} /> : null}
          </div>
        ))}
      </div>
      <LoadMore
        hasMore={!!logs.hasNextPage}
        loading={logs.isFetchingNextPage}
        onMore={() => void logs.fetchNextPage()}
      />

      <BottomSheet open={!!sheet} title={sheet ? t(EVENT_KEY[sheet.eventType]) : title} onClose={() => setSheet(null)}>
        {sheet ? (
          <div className="space-y-4">
            <div className="card bg-slate-50 p-3">
              <div className="text-sm font-semibold">{guardianLabel(sheet.auth)}</div>
              <div className="text-xs text-slate-500">{sheet.auth.student?.fullName}</div>
            </div>
            <TextAreaField label={t("reports.note")} value={note} onChange={setNote} />
            <button type="button" className="btn-primary w-full" onClick={submitLog} disabled={createLog.isPending}>
              {createLog.isPending ? t("leave.saving") : t("pickup.confirmLog")}
            </button>
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}
