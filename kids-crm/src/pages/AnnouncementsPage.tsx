import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { crm, type Announcement, type AnnouncementAudience, type CreateAnnouncement } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { usePaged } from "@/hooks/usePaged";
import { useT, type TKey } from "@/i18n";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

const AUDIENCES: AnnouncementAudience[] = ["ALL", "PARENTS", "TEACHERS", "CLASS"];
const AUDIENCE_KEY: Record<AnnouncementAudience, TKey> = {
  ALL: "audience.ALL",
  PARENTS: "audience.PARENTS",
  TEACHERS: "audience.TEACHERS",
  CLASS: "audience.CLASS",
};
const AUDIENCE_BADGE: Record<AnnouncementAudience, string> = {
  ALL: "b-blue",
  PARENTS: "b-green",
  TEACHERS: "b-slate",
  CLASS: "b-peach",
};

function ComposeModal({ schoolId, onClose }: { schoolId?: string; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const [audience, setAudience] = useState<AnnouncementAudience>("ALL");
  const [classroomId, setClassroomId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const save = useMutation({
    mutationFn: (publish: boolean) => {
      const payload: CreateAnnouncement = {
        audience,
        schoolId,
        classroomId: audience === "CLASS" ? classroomId : undefined,
        title,
        body,
        publish,
      };
      return crm.announcements.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
      toast(t("announcements.created"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  const valid = title.trim() && body.trim() && (audience !== "CLASS" || classroomId);

  return (
    <Modal
      open
      onClose={onClose}
      title={t("announcements.formTitle")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={() => save.mutate(false)} disabled={save.isPending || !valid}>
            {t("announcements.saveDraft")}
          </button>
          <button className="btn-primary text-sm" onClick={() => save.mutate(true)} disabled={save.isPending || !valid}>
            {save.isPending ? t("common.saving") : t("announcements.createPublish")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("announcements.fAudience")}>
          <select className="field" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {t(AUDIENCE_KEY[a])}
              </option>
            ))}
          </select>
        </Field>
        {audience === "CLASS" && (
          <Field label={t("announcements.fClass")}>
            <select className="field" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <option value="">—</option>
              {(classrooms.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field label={t("announcements.fTitle")}>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label={t("announcements.fBody")}>
        <textarea className="field" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      {audience === "CLASS" && !classroomId && (
        <p className="text-xs text-amber-600">{t("announcements.classRequired")}</p>
      )}
    </Modal>
  );
}

export function AnnouncementsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [audienceFilter, setAudienceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const schools = useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
  const audience = (audienceFilter || undefined) as AnnouncementAudience | undefined;
  const announcements = usePaged(
    ["announcements", { audience }],
    (pg) => crm.announcements.page({ audience, ...pg }),
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.items.filter((a) => !q || a.title.toLowerCase().includes(q));
  }, [announcements.items, search]);

  const selected = list.find((a) => a.id === selectedId) ?? null;

  const publish = useMutation({
    mutationFn: (id: string) => crm.announcements.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
      toast(t("announcements.publishedOk"));
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => crm.announcements.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast(t("announcements.deleted"));
      setDeleting(null);
      setSelectedId(null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <PageHeader title={t("announcements.title")} section={t("announcements.section")} />
      <main className="p-6">
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Danh sách */}
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <select className="field !w-auto !py-1.5" value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}>
                <option value="">{t("announcements.audienceAll")}</option>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {t(AUDIENCE_KEY[a])}
                  </option>
                ))}
              </select>
              <input
                className="field !py-1.5 flex-1 min-w-[8rem]"
                placeholder={t("announcements.searchTitle")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn-primary text-sm" onClick={() => setComposeOpen(true)}>
                {t("announcements.create")}
              </button>
            </div>

            {announcements.isLoading ? (
              <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
            ) : list.length === 0 ? (
              <div className="card p-12 text-center text-sm text-muted">{t("announcements.empty")}</div>
            ) : (
              <>
              <div className="space-y-3">
                {list.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "card w-full p-4 text-left transition",
                      selectedId === a.id && "ring-2 ring-[color:var(--primary)]/40",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${AUDIENCE_BADGE[a.audience]}`}>
                        {a.audience === "CLASS" && a.classroom ? a.classroom.name : t(AUDIENCE_KEY[a.audience])}
                      </span>
                      <span className="text-xs text-slate-400">
                        {a.publishedAt ? formatDateTime(a.publishedAt) : t("announcements.draft")}
                      </span>
                    </div>
                    <div className="font-semibold text-sm">{a.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{a.body}</div>
                  </button>
                ))}
              </div>
              <Pagination
                page={announcements.page}
                pages={announcements.pages}
                total={announcements.total}
                onPage={announcements.setPage}
                busy={announcements.isFetching}
              />
              </>
            )}
          </div>

          {/* Chi tiết */}
          <div className="lg:sticky lg:top-[78px] self-start w-full">
            {!selected ? (
              <div className="card p-12 text-center text-sm text-muted">{t("announcements.pickOne")}</div>
            ) : (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${AUDIENCE_BADGE[selected.audience]}`}>
                    {selected.audience === "CLASS" && selected.classroom
                      ? selected.classroom.name
                      : t(AUDIENCE_KEY[selected.audience])}
                  </span>
                  {!selected.publishedAt && <span className="badge b-amber">{t("announcements.draft")}</span>}
                </div>
                <div className="text-2xl font-bold mb-1">{selected.title}</div>
                <div className="text-xs text-slate-400 mb-4">
                  {selected.publishedAt
                    ? t("announcements.postedBy", { time: formatDateTime(selected.publishedAt) })
                    : t("announcements.draft")}
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{selected.body}</div>
                <div className="flex gap-2 mt-6">
                  {!selected.publishedAt && (
                    <button className="btn-primary text-sm" onClick={() => publish.mutate(selected.id)} disabled={publish.isPending}>
                      {t("announcements.publish")}
                    </button>
                  )}
                  <button className="btn-soft text-sm !text-red-600" onClick={() => setDeleting(selected)}>
                    {t("announcements.delete")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {composeOpen && <ComposeModal schoolId={schools.data?.[0]?.id} onClose={() => setComposeOpen(false)} />}
      <ConfirmDialog
        open={!!deleting}
        title={t("announcements.delete")}
        message={t("announcements.deleteConfirm")}
        confirmLabel={t("announcements.delete")}
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
