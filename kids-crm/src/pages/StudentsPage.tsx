import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { crm, type CreateStudent, type Gender, type Student } from "@/api/crm";
import { errorMessage } from "@/lib/errorMessage";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useDebounced } from "@/hooks/useDebounced";
import { usePaged } from "@/hooks/usePaged";
import { useT, type Translator } from "@/i18n";
import { fetchAllPages } from "@/lib/fetchAll";
import { formatDate } from "@/lib/labels";
import { GENDER_KEY, guardiansSummary } from "@/lib/people";
import { ageFrom, downloadCsv, initials, toDateInput } from "@/lib/utils";

const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];

type FormState = {
  fullName: string;
  nickname: string;
  dateOfBirth: string;
  gender: Gender;
  classroomId: string;
};

function StudentForm({
  open,
  editing,
  schoolId,
  onClose,
}: {
  open: boolean;
  editing: Student | null;
  schoolId?: string;
  onClose: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });

  const [form, setForm] = useState<FormState>({
    fullName: editing?.fullName ?? "",
    nickname: editing?.nickname ?? "",
    dateOfBirth: toDateInput(editing?.dateOfBirth),
    gender: editing?.gender ?? "MALE",
    classroomId: editing?.classroomId ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return crm.students.update(editing.id, {
          fullName: form.fullName,
          nickname: form.nickname || undefined,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          classroomId: form.classroomId || null,
        });
      }
      const body: CreateStudent = {
        schoolId: schoolId!,
        fullName: form.fullName,
        nickname: form.nickname || undefined,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        classroomId: form.classroomId || undefined,
      };
      return crm.students.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["classrooms"] });
      toast(editing ? t("common.saved") : t("common.created"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const valid = form.fullName.trim() && /^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth) && (editing || schoolId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t("students.formEditTitle") : t("students.formCreateTitle")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={save.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => save.mutate()}
            disabled={save.isPending || !valid}
          >
            {save.isPending ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <Field label={t("students.fFullName")}>
        <input
          className="field"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("students.fNickname")}>
          <input
            className="field"
            value={form.nickname}
            onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
          />
        </Field>
        <Field label={t("students.fDob")}>
          <input
            className="field"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("students.fGender")}>
          <select
            className="field"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t(GENDER_KEY[g])}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("students.fClass")}>
          <select
            className="field"
            value={form.classroomId}
            onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))}
          >
            <option value="">{t("students.noClass")}</option>
            {(classrooms.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function RowActions({ t, onEdit, onDelete }: { t: Translator; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        className="text-slate-400 hover:text-slate-600 px-2"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("common.edit")}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-32 rounded-xl border border-[#f4e7e0] bg-white py-1 shadow-lg text-sm">
            <button
              className="block w-full px-3 py-1.5 text-left hover:bg-[#fff3ec]"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              {t("common.edit")}
            </button>
            <button
              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-[#fff3ec]"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {t("common.delete")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function StudentsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [classFilter, setClassFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const schools = useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
  const schoolId = schools.data?.[0]?.id;
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });

  const debouncedSearch = useDebounced(search, 300);
  const gender = genderFilter ? (genderFilter as Gender) : undefined;
  const listFilters = {
    classroomId: classFilter || undefined,
    gender,
    search: debouncedSearch.trim() || undefined,
  };
  const students = usePaged(
    ["students", listFilters],
    (pg) => crm.students.page({ ...listFilters, ...pg }),
  );
  const items = students.items;

  const remove = useMutation({
    mutationFn: (id: string) => crm.students.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["classrooms"] });
      toast(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const [exporting, setExporting] = useState(false);
  async function exportCsv() {
    setExporting(true);
    try {
      // Xuất TẤT CẢ học sinh khớp filter hiện tại (không chỉ trang đang xem).
      const all = await fetchAllPages((pg) => crm.students.page({ ...listFilters, ...pg }));
      const header = [
        t("students.colName"),
        t("students.colNickname"),
        t("students.colDob"),
        t("students.colAge"),
        t("students.colGender"),
        t("students.colClass"),
        t("students.colGuardians"),
      ];
      const rows = all.map((s) => [
        s.fullName,
        s.nickname ?? "",
        formatDate(s.dateOfBirth),
        ageFrom(s.dateOfBirth) ?? "",
        t(GENDER_KEY[s.gender]),
        s.classroom?.name ?? "",
        guardiansSummary(s.parents),
      ]);
      downloadCsv("students.csv", [header, ...rows]);
    } catch (e) {
      toast(errorMessage(e, t), "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader title={t("students.title")} section={t("students.section")} />
      <main className="p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            className="field !w-auto !py-1.5"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">{t("students.allClasses")}</option>
            {(classrooms.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="field !w-auto !py-1.5"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">{t("gender.any")}</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t(GENDER_KEY[g])}
              </option>
            ))}
          </select>
          <input
            className="field !w-72 !py-1.5"
            placeholder={t("students.searchName")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ml-auto flex gap-2">
            <button
              className="btn-soft text-sm"
              onClick={exportCsv}
              disabled={exporting || !students.total}
            >
              {exporting ? t("common.exporting") : t("common.exportCsv")}
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t("students.create")}
            </button>
          </div>
        </div>

        {students.isLoading ? (
          <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
        ) : items.length === 0 ? (
          <div className="card p-12 text-center text-sm text-muted">{t("students.empty")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("students.colName")}</th>
                <th>{t("students.colNickname")}</th>
                <th>{t("students.colDob")}</th>
                <th>{t("students.colAge")}</th>
                <th>{t("students.colGender")}</th>
                <th>{t("students.colClass")}</th>
                <th>{t("students.colGuardians")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link
                      to={`/students/${s.id}`}
                      className="flex items-center gap-2 text-[color:var(--primary)] font-semibold"
                    >
                      <div className="avatar !w-8 !h-8 text-xs">{initials(s.fullName)}</div>
                      {s.fullName}
                    </Link>
                  </td>
                  <td>{s.nickname || "—"}</td>
                  <td>{formatDate(s.dateOfBirth)}</td>
                  <td>{ageFrom(s.dateOfBirth) ?? "—"}</td>
                  <td>{t(GENDER_KEY[s.gender])}</td>
                  <td>
                    {s.classroom ? (
                      <span className="badge b-peach">{s.classroom.name}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">{t("students.noClass")}</span>
                    )}
                  </td>
                  <td>{guardiansSummary(s.parents) || t("students.noGuardian")}</td>
                  <td className="text-right">
                    <RowActions
                      t={t}
                      onEdit={() => {
                        setEditing(s);
                        setFormOpen(true);
                      }}
                      onDelete={() => setDeleting(s)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={students.page}
          pages={students.pages}
          total={students.total}
          onPage={students.setPage}
          busy={students.isFetching}
        />
      </main>

      {formOpen && (
        <StudentForm
          key={editing?.id ?? "new"}
          open={formOpen}
          editing={editing}
          schoolId={schoolId}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t("common.delete")}
        message={t("students.deleteConfirm")}
        confirmLabel={t("common.delete")}
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
