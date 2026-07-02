import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { crm, type CreateMember, type Member, type TenantRole } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { ROLE } from "@/lib/people";
import { cn, downloadCsv, initials } from "@/lib/utils";

const ROLES: TenantRole[] = ["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "NURSE", "FINANCE", "PARENT"];
const PAGE_SIZE = 10;

function CreateMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const schools = useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
  const [form, setForm] = useState({
    fullName: "",
    role: "TEACHER" as TenantRole,
    phone: "",
    email: "",
    password: "",
    schoolId: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: () => {
      const body: CreateMember = {
        fullName: form.fullName,
        role: form.role,
        password: form.password,
        phone: form.phone || undefined,
        email: form.email || undefined,
        schoolId: form.schoolId || null,
      };
      return crm.members.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast(t("common.created"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  const valid =
    form.fullName.trim().length >= 2 && form.password.length >= 8 && (form.phone || form.email);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("members.formTitle")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={create.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => create.mutate()}
            disabled={create.isPending || !valid}
          >
            {create.isPending ? t("common.saving") : t("common.create")}
          </button>
        </>
      }
    >
      <Field label={t("members.fFullName")}>
        <input className="field" value={form.fullName} onChange={set("fullName")} autoFocus />
      </Field>
      <Field label={t("members.fRole")}>
        <select className="field" value={form.role} onChange={set("role")}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(ROLE[r].key)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("members.fPhone")}>
          <input className="field" value={form.phone} onChange={set("phone")} placeholder="0901234567" />
        </Field>
        <Field label={t("members.fEmail")}>
          <input className="field" type="email" value={form.email} onChange={set("email")} />
        </Field>
      </div>
      <p className="text-xs text-slate-400 -mt-1">{t("members.phoneOrEmail")}</p>
      <Field label={t("members.fPassword")}>
        <input className="field" value={form.password} onChange={set("password")} />
      </Field>
      <p className="text-xs text-slate-400 -mt-1">{t("members.passwordHint")}</p>
      {(schools.data?.length ?? 0) > 1 && (
        <Field label={t("members.fSchool")}>
          <select className="field" value={form.schoolId} onChange={set("schoolId")}>
            <option value="">{t("members.schoolTenantWide")}</option>
            {(schools.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
}

function ViewMemberModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const { t } = useT();
  const rows: [string, string][] = [
    [t("members.fFullName"), member.user.fullName],
    [t("members.fRole"), t(ROLE[member.role].key)],
    [t("members.colPhone"), member.user.phone || "—"],
    [t("members.fEmail"), member.user.email || "—"],
    [t("members.colStatus"), t(member.user.isActive ? "members.statusActive" : "members.statusInactive")],
    [t("members.colCreated"), formatDate(member.createdAt)],
    [t("common.school"), member.school?.name ?? t("members.schoolTenantWide")],
  ];
  return (
    <Modal open onClose={onClose} title={member.user.fullName}>
      <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-400 uppercase font-semibold mb-0.5">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

function ResetPasswordModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const [password, setPassword] = useState("Password123");
  const reset = useMutation({
    mutationFn: () => crm.members.resetPassword(member.user.id, password),
    onSuccess: () => {
      toast(t("feature.passwordResetOk"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.resetPassword")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={reset.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => reset.mutate()}
            disabled={password.length < 8 || reset.isPending}
          >
            {reset.isPending ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <div className="rounded-lg bg-slate-50 p-3 text-sm font-semibold">{member.user.fullName}</div>
      <Field label={t("feature.newPassword")}>
        <input className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}

export function MembersPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [toggling, setToggling] = useState<Member | null>(null);
  const [resetting, setResetting] = useState<Member | null>(null);

  const members = useQuery({ queryKey: ["members"], queryFn: () => crm.members.list() });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members.data ?? []).filter((m) => {
      const statusOk =
        !statusFilter || (statusFilter === "active" ? m.user.isActive : !m.user.isActive);
      const searchOk =
        !q ||
        m.user.fullName.toLowerCase().includes(q) ||
        (m.user.phone ?? "").toLowerCase().includes(q) ||
        (m.user.email ?? "").toLowerCase().includes(q);
      return (!roleFilter || m.role === roleFilter) && statusOk && searchOk;
    });
  }, [members.data, roleFilter, statusFilter, search]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const setStatus = useMutation({
    mutationFn: (m: Member) => crm.members.setStatus(m.user.id, !m.user.isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast(t("common.saved"));
      setToggling(null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  function exportCsv() {
    const header = [
      t("members.colName"),
      t("members.colPhone"),
      t("members.fEmail"),
      t("members.colRole"),
      t("members.colStatus"),
      t("members.colCreated"),
    ];
    const rows = filtered.map((m) => [
      m.user.fullName,
      m.user.phone ?? "",
      m.user.email ?? "",
      t(ROLE[m.role].key),
      t(m.user.isActive ? "members.statusActive" : "members.statusInactive"),
      formatDate(m.createdAt),
    ]);
    downloadCsv("members.csv", [header, ...rows]);
  }

  return (
    <>
      <PageHeader title={t("members.title")} section={t("members.section")} />
      <main className="p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            className="field !w-auto !py-1.5"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("roles.any")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(ROLE[r].key)}
              </option>
            ))}
          </select>
          <select
            className="field !w-auto !py-1.5"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("members.statusAll")}</option>
            <option value="active">{t("members.statusActive")}</option>
            <option value="inactive">{t("members.statusInactive")}</option>
          </select>
          <input
            className="field !w-72 !py-1.5"
            placeholder={t("members.searchName")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <div className="ml-auto flex gap-2">
            <button className="btn-soft text-sm" onClick={exportCsv} disabled={!total}>
              {t("common.exportCsv")}
            </button>
            <button className="btn-primary text-sm" onClick={() => setCreateOpen(true)}>
              {t("members.create")}
            </button>
          </div>
        </div>

        {members.isLoading ? (
          <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
        ) : total === 0 ? (
          <div className="card p-12 text-center text-sm text-muted">{t("members.empty")}</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("members.colName")}</th>
                  <th>{t("members.colPhone")}</th>
                  <th>{t("members.colRole")}</th>
                  <th>{t("members.colStatus")}</th>
                  <th>{t("members.colCreated")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar !w-8 !h-8 text-xs">{initials(m.user.fullName)}</div>
                        {m.user.fullName}
                      </div>
                    </td>
                    <td>{m.user.phone || m.user.email || "—"}</td>
                    <td>
                      <span className={`badge ${ROLE[m.role].badge}`}>{t(ROLE[m.role].key)}</span>
                    </td>
                    <td>
                      <span className={`badge ${m.user.isActive ? "b-green" : "b-amber"}`}>
                        {t(m.user.isActive ? "members.statusActive" : "members.statusInactive")}
                      </span>
                    </td>
                    <td>{formatDate(m.createdAt)}</td>
                    <td className="whitespace-nowrap">
                      <button
                        className="text-[color:var(--primary)] text-xs font-semibold"
                        onClick={() => setViewing(m)}
                      >
                        {t("common.view")}
                      </button>
                      <button
                        className={cn(
                          "text-xs font-semibold ml-3",
                          m.user.isActive ? "text-slate-500" : "text-green-600",
                        )}
                        onClick={() => setToggling(m)}
                      >
                        {t(m.user.isActive ? "members.deactivate" : "members.activate")}
                      </button>
                      <button
                        className="text-xs font-semibold ml-3 text-amber-700"
                        onClick={() => setResetting(m)}
                      >
                        {t("feature.resetPassword")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
              <div>
                {t("members.showing", {
                  from: total === 0 ? 0 : safePage * PAGE_SIZE + 1,
                  to: Math.min(total, safePage * PAGE_SIZE + PAGE_SIZE),
                  total,
                })}
              </div>
              {pageCount > 1 && (
                <div className="flex gap-1">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={cn(
                        "w-8 h-8 rounded-lg",
                        i === safePage ? "bg-[color:var(--primary)] text-white" : "bg-white",
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {createOpen && <CreateMemberModal open={createOpen} onClose={() => setCreateOpen(false)} />}
      {viewing && <ViewMemberModal member={viewing} onClose={() => setViewing(null)} />}
      {resetting && <ResetPasswordModal member={resetting} onClose={() => setResetting(null)} />}
      <ConfirmDialog
        open={!!toggling}
        title={t(toggling?.user.isActive ? "members.deactivate" : "members.activate")}
        message={t(toggling?.user.isActive ? "members.deactivateConfirm" : "members.activateConfirm")}
        danger={toggling?.user.isActive}
        busy={setStatus.isPending}
        onConfirm={() => toggling && setStatus.mutate(toggling)}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
