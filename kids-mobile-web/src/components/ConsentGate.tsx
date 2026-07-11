import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { meKeys, useMe } from "@/api/auth";
import { acceptConsent, getLegal } from "@/api/consent";

/**
 * BL-046 — Cổng consent (mobile): user chưa đồng ý văn bản pháp lý hiệu lực phải đọc + tick đồng ý
 * mới dùng được app. Render trong PhoneFrame, chặn toàn bộ tới khi pendingConsents rỗng.
 */
export function ConsentGate() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const pending = me?.pendingConsents ?? [];
  const [checked, setChecked] = useState(false);

  const legalQuery = useQuery({ queryKey: ["public-legal"], queryFn: getLegal });
  const docs = legalQuery.data ?? [];

  const accept = useMutation({
    mutationFn: () => acceptConsent(pending.map((d) => d.id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: meKeys.me });
    },
  });

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-3">
        <h1 className="text-base font-bold text-slate-800">Đồng ý điều khoản</h1>
        <p className="mt-0.5 text-xs text-slate-500">Đọc và đồng ý để tiếp tục sử dụng ứng dụng.</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {pending.map((p) => {
          const body = docs.find((d) => d.id === p.id)?.body ?? p.summary ?? "";
          return (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                {p.title} <span className="font-normal text-slate-400">(v{p.version})</span>
              </div>
              <div className="max-h-44 overflow-y-auto whitespace-pre-wrap px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                {legalQuery.isLoading ? "Đang tải nội dung…" : body}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-3 border-t border-slate-200 px-4 py-3">
        <label className="flex items-start gap-2 text-xs text-slate-600">
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
        {accept.isError && <p className="text-xs text-red-600">Không lưu được, vui lòng thử lại.</p>}
      </div>
    </div>
  );
}
