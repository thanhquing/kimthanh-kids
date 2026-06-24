import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform, type CreateTenantInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { badgeFor, formatDate, TENANT_STATUS, TIER_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "", label: "Tất cả" },
  { key: "ACTIVE", label: "Hoạt động" },
  { key: "TRIAL", label: "Dùng thử" },
  { key: "PAST_DUE", label: "Quá hạn" },
  { key: "SUSPENDED", label: "Tạm khóa" },
];

const EMPTY: CreateTenantInput = {
  schoolName: "",
  slug: "",
  adminFullName: "",
  adminEmail: "",
  adminPassword: "",
};

export function TenantsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTenantInput>(EMPTY);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenants", "list", status],
    queryFn: () => platform.listTenants(1, status || undefined),
  });

  const create = useMutation({
    mutationFn: () => platform.createTenant(form),
    onSuccess: () => {
      toast("Đã tạo trường mới");
      setOpen(false);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Tạo trường thất bại", "error"),
  });

  const items = (data ?? []).filter((t) => {
    const q = search.trim().toLowerCase();
    return !q || t.slug.toLowerCase().includes(q) || t.legalName?.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader title="Trường thuê dịch vụ">
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
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={cn("chip", status === f.key && "active")}
              onClick={() => setStatus(f.key)}
            >
              {f.label}
              {f.key === "" && data ? ` · ${data.length}` : ""}
            </button>
          ))}
          <div className="relative ml-auto w-64">
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
          <table className="table">
            <thead>
              <tr>
                <th>Trường</th>
                <th>Gói</th>
                <th>Trạng thái</th>
                <th>Cơ sở</th>
                <th>Hết hạn kỳ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="!text-center text-muted">
                    Đang tải…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="!text-center text-red-600">
                    Không tải được danh sách.
                  </td>
                </tr>
              )}
              {!isLoading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="!text-center text-muted">
                    Không có trường nào.
                  </td>
                </tr>
              )}
              {items.map((t) => {
                const st = badgeFor(TENANT_STATUS, t.status);
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#fff8f3] cursor-pointer"
                    onClick={() => navigate(`/tenants/${t.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar !w-8 !h-8 text-xs">
                          {(t.legalName ?? t.slug).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{t.legalName ?? t.slug}</div>
                          <div className="text-xs text-slate-400">{t.slug}.kimthanhkids.vn</div>
                        </div>
                      </div>
                    </td>
                    <td>{TIER_LABEL[t.planTier] ?? t.planTier}</td>
                    <td>
                      <span className={cn("badge", st.badge)}>{st.label}</span>
                    </td>
                    <td>{t._count?.schools ?? "—"}</td>
                    <td>{formatDate(t.currentPeriodEnd)}</td>
                    <td className="text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
