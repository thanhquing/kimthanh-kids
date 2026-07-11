import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { me } from "../api/auth";
import { acceptConsent, getLegal } from "../api/consent";

/**
 * BL-046 — Cổng consent: user (GV/PH/NV) CHƯA đồng ý văn bản pháp lý hiệu lực thì phải đọc + tick
 * đồng ý mới vào được app. Chặn toàn bộ giao diện tới khi /auth/me hết pendingConsents.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: me, staleTime: 5 * 60_000 });
  const pending = meQuery.data?.pendingConsents ?? [];
  const [checked, setChecked] = useState(false);

  const legalQuery = useQuery({
    queryKey: ["public-legal"],
    queryFn: getLegal,
    enabled: pending.length > 0,
  });

  const accept = useMutation({
    mutationFn: () => acceptConsent(pending.map((d) => d.id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  if (meQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">Đang tải…</div>
    );
  }
  if (pending.length === 0) return <>{children}</>;

  const docs = legalQuery.data ?? [];
  const pendingDocs = pending.map((p) => ({
    ...p,
    body: docs.find((d) => d.id === p.id)?.body ?? p.summary ?? "",
  }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-lg font-bold text-slate-800">Đồng ý điều khoản trước khi tiếp tục</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vui lòng đọc và đồng ý các văn bản dưới đây để sử dụng hệ thống.
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {pendingDocs.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {d.title} <span className="font-normal text-slate-400">(v{d.version})</span>
              </div>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-xs leading-relaxed text-slate-600">
                {legalQuery.isLoading ? "Đang tải nội dung…" : d.body}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-slate-200 px-6 py-4">
          <label className="flex items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>Tôi đã đọc và đồng ý toàn bộ văn bản nêu trên.</span>
          </label>
          <button
            type="button"
            disabled={!checked || accept.isPending}
            onClick={() => accept.mutate()}
            className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {accept.isPending ? "Đang lưu…" : "Đồng ý & tiếp tục"}
          </button>
          {accept.isError && (
            <p className="text-sm text-red-600">Không lưu được, vui lòng thử lại.</p>
          )}
        </div>
      </div>
    </div>
  );
}
