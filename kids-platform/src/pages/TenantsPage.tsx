import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Download, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform, type CreateTenantInput, type Tenant } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { badgeFor, formatDate, TENANT_STATUS, TIER_LABEL } from "@/lib/labels";
import { invalidatePlatformData } from "@/lib/queries";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const CYCLE_SHORT: Record<string, string> = {
  MONTHLY: "Tháng",
  QUARTERLY: "Quý",
  ANNUAL: "Năm",
};

const QUOTA_SHORT: Record<string, string> = {
  STUDENTS: "HS",
  TEACHERS: "GV",
  CLASSROOMS: "Lớp",
  STORAGE_MB: "Lưu trữ",
};

/** Giá trị hạn mức gọn: lưu trữ quy GB, còn lại giữ nguyên số. */
function quotaValue(metric: string, v: number): string {
  if (metric === "STORAGE_MB") return `${Math.round((v / 1024) * 10) / 10}GB`;
  return String(v);
}

const EMPTY: CreateTenantInput = {
  schoolName: "",
  slug: "",
  taxCode: "",
  adminFullName: "",
  adminEmail: "",
  adminPassword: "",
};

const days = (iso?: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0;

/** "Hết hạn kỳ" theo ngữ cảnh trạng thái — khớp mock (Còn N ngày / Trễ N ngày / ngày). */
function endLabel(t: Tenant): string {
  if (t.status === "TRIAL") {
    const d = days(t.trialEndsAt);
    return t.trialEndsAt ? (d >= 0 ? `Còn ${d} ngày` : "Hết hạn dùng thử") : "—";
  }
  if (t.status === "PAST_DUE") {
    const d = days(t.currentPeriodEnd);
    return t.currentPeriodEnd ? `Trễ ${Math.abs(d)} ngày` : "—";
  }
  return formatDate(t.currentPeriodEnd);
}

/** VND → "1.2tr" / "0đ". */
function mrrShort(v?: number): string {
  if (!v) return "0đ";
  return `${parseFloat((v / 1_000_000).toFixed(2))}tr`;
}

const name = (t: Tenant) => t.settings?.displayName || t.legalName || t.slug;
const initials = (t: Tenant) =>
  name(t)
    .replace(/\(.*\)/, "")
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function TenantsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  // Lọc theo cảnh báo quota — nhận giá trị từ URL (?quota=) khi điều hướng từ trang Cần hành động.
  const [quota, setQuota] = useState(() => searchParams.get("quota") ?? "");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTenantInput>(EMPTY);

  // Debounce 350ms: chỉ gọi server sau khi ngừng gõ; đổi từ khóa → về trang 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  // Sync filter quota theo URL (?quota=) — mount lần đầu là no-op (state khởi tạo từ URL),
  // chỉ đổi khi điều hướng tới ?quota= khác mà không remount.
  useEffect(() => {
    setQuota(searchParams.get("quota") ?? "");
    setPage(1);
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenants", "list", status, plan, quota, page, debouncedQ],
    queryFn: () =>
      platform.listTenants(
        page,
        status || undefined,
        debouncedQ || undefined,
        plan || undefined,
        quota || undefined,
      ),
  });
  const { data: stats } = useQuery({
    queryKey: ["tenants", "stats"],
    queryFn: () => platform.tenantStats(),
  });

  const total = data?.meta.total ?? 0;
  const rows = data?.items ?? []; // lọc ở server (param q)

  const CHIPS = [
    { key: "", label: "Tất cả", count: stats?.total },
    { key: "ACTIVE", label: "Hoạt động", count: stats?.ACTIVE },
    { key: "TRIAL", label: "Dùng thử", count: stats?.TRIAL },
    { key: "PAST_DUE", label: "Quá hạn", count: stats?.PAST_DUE },
    { key: "SUSPENDED", label: "Tạm khóa", count: stats?.SUSPENDED },
  ];

  const create = useMutation({
    mutationFn: () => platform.createTenant(form),
    onSuccess: () => {
      toast("Đã tạo trường mới");
      setOpen(false);
      setForm(EMPTY);
      invalidatePlatformData(qc);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Tạo trường thất bại", "error"),
  });

  function pick(key: string) {
    setStatus(key);
    setPage(1);
  }

  // Đổi filter quota = đổi URL (?quota=); effect bên dưới mới là nơi sync state → URL là nguồn
  // sự thật, link chia sẻ được và bấm KPI khác từ trang Cần hành động luôn lọc đúng.
  function pickQuota(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("quota", value);
        else next.delete("quota");
        return next;
      },
      { replace: true },
    );
  }

  function exportCsv() {
    const head = ["Trường", "Slug", "Gói", "Trạng thái", "Học sinh", "Chu kỳ", "Hết hạn kỳ", "MRR"];
    const lines = rows.map((t) =>
      [
        name(t),
        t.slug,
        TIER_LABEL[t.planTier] ?? t.planTier ?? "—",
        badgeFor(TENANT_STATUS, t.status).label,
        t.studentCount ?? 0,
        (t.billingCycle && CYCLE_SHORT[t.billingCycle]) || "—",
        endLabel(t),
        mrrShort(t.mrr),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "truong-thue.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + (data?.items.length ?? 0);

  return (
    <>
      <PageHeader section="Khách hàng" title="Trường thuê dịch vụ">
        <button className="btn-soft inline-flex items-center gap-2 text-sm" onClick={exportCsv}>
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
        <button
          className="btn-primary inline-flex items-center gap-2 text-sm"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Thêm trường
        </button>
      </PageHeader>

      <main className="p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              className={cn("chip", status === c.key && "active")}
              onClick={() => pick(c.key)}
            >
              {c.label}
              {c.count != null ? ` · ${c.count}` : ""}
            </button>
          ))}
          <select
            className="field !py-1.5 !w-auto ml-auto"
            value={quota}
            onChange={(e) => pickQuota(e.target.value)}
          >
            <option value="">Tất cả hạn mức</option>
            <option value="at-risk">Sắp chạm hạn (≥80%)</option>
          </select>
          <select
            className="field !py-1.5 !w-auto"
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả gói</option>
            {["FREE", "STARTER", "PRO", "ENTERPRISE", "CUSTOM"].map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t] ?? t}
              </option>
            ))}
          </select>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              className="field !pl-9 !py-1.5"
              placeholder="Tìm theo tên / slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Trường</th>
                <th>Gói</th>
                <th>Trạng thái</th>
                <th>Hạn mức</th>
                <th>Chu kỳ</th>
                <th>Hết hạn kỳ</th>
                <th>MRR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="!text-center text-muted">
                    Đang tải…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={8} className="!text-center text-red-600">
                    Không tải được danh sách.
                  </td>
                </tr>
              )}
              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="!text-center text-muted">
                    Không có trường nào.
                  </td>
                </tr>
              )}
              {rows.map((t) => {
                const st = badgeFor(TENANT_STATUS, t.status);
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#fff8f3] cursor-pointer"
                    onClick={() => navigate(`/tenants/${t.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar !w-8 !h-8 text-xs">{initials(t)}</div>
                        <div>
                          <div className="font-semibold">{name(t)}</div>
                          <div className="text-xs text-slate-400">{t.slug}.kimthanhkids.vn</div>
                        </div>
                      </div>
                    </td>
                    <td>{TIER_LABEL[t.planTier] ?? t.planTier ?? "—"}</td>
                    <td>
                      <span className={cn("badge", st.badge)}>{st.label}</span>
                    </td>
                    <td>
                      {t.quota?.length ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs min-w-[10rem]">
                          {t.quota.map((qm) => {
                            const full = qm.limit != null && qm.used >= qm.limit;
                            const near = qm.limit != null && qm.used / qm.limit >= 0.8;
                            return (
                              <div key={qm.metric} className="flex justify-between gap-2">
                                <span className="text-slate-400">{QUOTA_SHORT[qm.metric] ?? qm.metric}</span>
                                <span
                                  className={cn(
                                    "tabular-nums",
                                    full
                                      ? "text-red-600 font-semibold"
                                      : near
                                        ? "text-amber-600 font-semibold"
                                        : "text-slate-600",
                                  )}
                                >
                                  {quotaValue(qm.metric, qm.used)}/
                                  {qm.limit == null ? "∞" : quotaValue(qm.metric, qm.limit)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td>{(t.billingCycle && CYCLE_SHORT[t.billingCycle]) || "—"}</td>
                    <td>{endLabel(t)}</td>
                    <td className="font-semibold">{mrrShort(t.mrr)}</td>
                    <td className="text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <div>
            Hiển thị {from}–{to} trên {total} trường
          </div>
          <div className="flex gap-1">
            <button
              className="btn-soft !py-1 !px-3 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <button
              className="btn-soft !py-1 !px-3 disabled:opacity-40"
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Thêm trường mới"
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOpen(false)}>
              Hủy
            </button>
            <button
              className="btn-primary text-sm"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Đang tạo…" : "Tạo trường"}
            </button>
          </>
        }
      >
        <Field label="Tên trường">
          <input
            className="field"
            value={form.schoolName}
            onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
          />
        </Field>
        <Field label="Slug (subdomain)">
          <input
            className="field"
            placeholder="vd: hoasen"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </Field>
        <Field label="Mã số thuế (MST)">
          <input
            className="field"
            placeholder="10 hoặc 13 chữ số"
            value={form.taxCode}
            onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
          />
        </Field>
        <Field label="Họ tên quản trị">
          <input
            className="field"
            value={form.adminFullName}
            onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
          />
        </Field>
        <Field label="Email quản trị">
          <input
            className="field"
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          />
        </Field>
        <Field label="Mật khẩu (≥ 8 ký tự)">
          <input
            type="password"
            className="field"
            value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
          />
        </Field>
      </Modal>
    </>
  );
}
