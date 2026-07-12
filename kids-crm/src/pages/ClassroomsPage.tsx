import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { crm, type Classroom, type CreateClassroom } from "@/api/crm";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntitySelect } from "@/components/ui/EntitySelect";
import { Field, Modal } from "@/components/ui/Modal";
import { LoadMore } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT, type Translator } from "@/i18n";
import { fetchAllPages } from "@/lib/fetchAll";
import { errorMessage } from "@/lib/errorMessage";

function useSchools() {
  return useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
}

type FormState = { name: string; ageGroup: string; capacity: string; homeroomTeacherId: string };
const EMPTY: FormState = { name: "", ageGroup: "", capacity: "25", homeroomTeacherId: "" };

function ClassroomForm({
  open,
  editing,
  onClose,
  schoolId,
}: {
  open: boolean;
  editing: Classroom | null;
  onClose: () => void;
  schoolId?: string;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  // Modal được remount theo `key` mỗi lần mở (xem ClassroomsPage) → khởi tạo từ `editing` là đủ.
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          name: editing.name,
          ageGroup: editing.ageGroup ?? "",
          capacity: String(editing.capacity ?? "25"),
          homeroomTeacherId: editing.homeroomTeacherId ?? "",
        }
      : EMPTY,
  );

  const save = useMutation({
    mutationFn: async () => {
      const capacity = form.capacity ? Number(form.capacity) : undefined;
      if (editing) {
        return crm.classrooms.update(editing.id, {
          name: form.name,
          ageGroup: form.ageGroup || undefined,
          capacity,
          homeroomTeacherId: form.homeroomTeacherId || null,
        });
      }
      const body: CreateClassroom = {
        schoolId: schoolId!,
        name: form.name,
        ageGroup: form.ageGroup || undefined,
        capacity,
        homeroomTeacherId: form.homeroomTeacherId || undefined,
      };
      return crm.classrooms.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classrooms"] });
      toast(editing ? t("common.saved") : t("common.created"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t("classrooms.formEditTitle") : t("classrooms.formCreateTitle")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={save.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name.trim() || (!editing && !schoolId)}
          >
            {save.isPending ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <Field label={t("classrooms.fName")}>
        <input className="field" value={form.name} onChange={set("name")} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("classrooms.fAgeGroup")}>
          <input
            className="field"
            value={form.ageGroup}
            onChange={set("ageGroup")}
            placeholder={t("classrooms.fAgeGroupHint")}
          />
        </Field>
        <Field label={t("classrooms.fCapacity")}>
          <input className="field" type="number" min={1} value={form.capacity} onChange={set("capacity")} />
        </Field>
      </div>
      <Field label={t("classrooms.fHomeroom")}>
        <EntitySelect
          value={form.homeroomTeacherId}
          selectedLabel={editing?.homeroomTeacher?.fullName ?? ""}
          fetchPage={(search) => crm.members.page({ search: search || undefined, role: "TEACHER", pageSize: 20 })}
          labelOf={(m) => m.user.fullName}
          idOf={(m) => m.user.id}
          onChange={(id) => setForm((f) => ({ ...f, homeroomTeacherId: id }))}
          queryKey={["members-select", "teachers"]}
          placeholder={t("classrooms.noHomeroom")}
        />
      </Field>
    </Modal>
  );
}

function ClassroomCard({ c, t, onEdit, onDelete }: {
  c: Classroom;
  t: Translator;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const enrolled = c._count?.students ?? 0;
  const pct = c.capacity ? Math.min(100, Math.round((enrolled / c.capacity) * 100)) : 0;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-lg">{c.name}</div>
        {c.ageGroup && <span className="badge b-peach">{c.ageGroup}</span>}
      </div>
      <div className="text-sm text-slate-500 mb-2">
        {t("classrooms.homeroom")} · {c.homeroomTeacher?.fullName ?? t("classrooms.noHomeroom")}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full brand-grad" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold">
          {enrolled}/{c.capacity}
        </span>
      </div>
      <div className="flex gap-2">
        <Link to={`/classrooms/${c.id}`} className="btn-soft flex-1 text-sm text-center">
          {t("classrooms.detail")}
        </Link>
        <button className="btn-soft text-sm" onClick={onEdit} aria-label={t("common.edit")}>
          {t("common.edit")}
        </button>
        <button
          className="btn-soft text-sm !text-red-600"
          onClick={onDelete}
          aria-label={t("common.delete")}
        >
          {t("common.delete")}
        </button>
      </div>
    </div>
  );
}

export function ClassroomsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState<Classroom | null>(null);

  const schools = useSchools();
  const schoolId = schools.data?.[0]?.id;

  const classrooms = useLoadMore(["classrooms"], (pg) => crm.classrooms.page(pg));
  const teachersCount = useQuery({
    queryKey: ["members", "teachers-count"],
    queryFn: () => fetchAllPages((pg) => crm.members.page({ role: "TEACHER", ...pg })),
    select: (rows) => rows.filter((m) => m.role === "TEACHER").length,
  });

  const list = classrooms.items;
  const filtered = useMemo(
    () => list.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())),
    [list, search],
  );
  const totalStudents = list.reduce((sum, c) => sum + (c._count?.students ?? 0), 0);

  const remove = useMutation({
    mutationFn: (id: string) => crm.classrooms.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classrooms"] });
      toast(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: Classroom) {
    setEditing(c);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader title={t("classrooms.title")} section={t("classrooms.section")}>
        <div className="hidden md:block relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            className="field !pl-9 !py-1.5"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </PageHeader>
      <main className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-500">
            {t("classrooms.summary", {
              classes: list.length,
              students: totalStudents,
              teachers: teachersCount.data ?? 0,
            })}
          </div>
          <button className="btn-primary text-sm" onClick={openCreate}>
            {t("classrooms.create")}
          </button>
        </div>

        {classrooms.isLoading ? (
          <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-sm text-muted">{t("classrooms.empty")}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <ClassroomCard
                key={c.id}
                c={c}
                t={t}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleting(c)}
              />
            ))}
          </div>
        )}
        <LoadMore
          hasMore={classrooms.hasNextPage}
          loading={classrooms.isFetchingNextPage}
          onMore={() => classrooms.fetchNextPage()}
        />
      </main>

      {formOpen && (
        <ClassroomForm
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
        message={t("classrooms.deleteConfirm")}
        confirmLabel={t("common.delete")}
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
