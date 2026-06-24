import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Download, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform, type CreateTenantInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { badgeFor, TENANT_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";

// LƯU Ý: data TĨNH khớp mock-ui (kids-landing/.../platform/tenants.html). Nối BE sau:
// listTenants cần trả thêm số học sinh / chu kỳ / MRR mỗi dòng + meta phân trang + đếm theo trạng thái.

const CHIPS = [
  { key: "", label: "Tất cả", count: 142 },
  { key: "ACTIVE", label: "Hoạt động", count: 98 },
  { key: "TRIAL", label: "Dùng thử", count: 31 },
  { key: "PAST_DUE", label: "Quá hạn", count: 9 },
  { key: "SUSPENDED", label: "Tạm khóa", count: 4 },
];

type Row = {
  name: string;
  slug: string;
  plan: string;
  status: string;
  students: number;
  cycle: string;
  end: string;
  mrr: string;
};

const ROWS: Row[] = [
  { name: "Mầm non ABC", slug: "abc", plan: "Khởi đầu", status: "TRIAL", students: 32, cycle: "—", end: "Còn 28 ngày", mrr: "0đ" },
  { name: "Hoa Mai Montessori", slug: "hoamai", plan: "Chuyên nghiệp", status: "ACTIVE", students: 180, cycle: "Tháng", end: "12/07/2026", mrr: "1.2tr" },
  { name: "Sao Việt Kids", slug: "saoviet", plan: "Chuyên nghiệp", status: "ACTIVE", students: 95, cycle: "Quý", end: "30/08/2026", mrr: "1.08tr" },
  { name: "Little Stars", slug: "littlestars", plan: "Chuyên nghiệp", status: "PAST_DUE", students: 140, cycle: "Tháng", end: "Trễ 5 ngày", mrr: "1.2tr" },
  { name: "Rainbow Kids", slug: "rainbow", plan: "Hệ thống", status: "ACTIVE", students: 420, cycle: "Năm", end: "01/2027", mrr: "4.5tr" },
  { name: "Eduplay+", slug: "eduplay", plan: "Chuyên nghiệp", status: "SUSPENDED", students: 60, cycle: "Tháng", end: "—", mrr: "1.2tr" },
  { name: "Happy Bear (dedicated)", slug: "happybear", plan: "Hệ thống", status: "ACTIVE", students: 600, cycle: "Hợp đồng", end: "Riêng", mrr: "—" },
  { name: "Peace Montessori", slug: "peace", plan: "Khởi đầu", status: "TRIAL", students: 18, cycle: "—", end: "Còn 12 ngày", mrr: "0đ" },
];

function initials(name: string): string {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

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

  const items = ROWS.filter((t) => {
    if (status && t.status !== status) return false;
    const q = search.trim().toLowerCase();
    return !q || t.slug.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
  });

  function exportCsv() {
    const head = ["Trường", "Slug", "Gói", "Trạng thái", "Học sinh", "Chu kỳ", "Hết hạn kỳ", "MRR"];
    const lines = items.map((t) =>
      [t.name, t.slug, t.plan, badgeFor(TENANT_STATUS, t.status).label, t.students, t.cycle, t.end, t.mrr]
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
              onClick={() => setStatus(c.key)}
            >
              {c.label} · {c.count}
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
                <th>Học sinh</th>
                <th>Chu kỳ</th>
                <th>Hết hạn kỳ</th>
                <th>MRR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="!text-center text-muted">
                    Không có trường nào.
                  </td>
                </tr>
              )}
              {items.map((t) => {
                const st = badgeFor(TENANT_STATUS, t.status);
                return (
                  <tr
                    key={t.slug}
                    className="hover:bg-[#fff8f3] cursor-pointer"
                    onClick={() => navigate(`/tenants/${t.slug}`)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar !w-8 !h-8 text-xs">{initials(t.name)}</div>
                        <div>
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-xs text-slate-400">{t.slug}.kimthanhkids.vn</div>
                        </div>
                      </div>
                    </td>
                    <td>{t.plan}</td>
                    <td>
                      <span className={cn("badge", st.badge)}>{st.label}</span>
                    </td>
                    <td>{t.students}</td>
                    <td>{t.cycle}</td>
                    <td>{t.end}</td>
                    <td className="font-semibold">{t.mrr}</td>
                    <td className="text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <div>Hiển thị 1–{items.length} trên 142 trường</div>
          <div className="flex gap-1">
            <button className="btn-soft !py-1 !px-3">Trước</button>
            <button className="btn-soft !py-1 !px-3">Sau</button>
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
