import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { crm, type Album } from "@/api/crm";
import { ApiError } from "@/api/http";
import { AuthImage } from "@/components/ui/AuthImage";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { LoadMore } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/labels";

function AlbumModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const schools = useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const create = useMutation({
    mutationFn: () =>
      crm.albums.create({
        title,
        description: description || undefined,
        classroomId: classroomId || undefined,
        schoolId: classroomId ? undefined : schools.data?.[0]?.id,
      }),
    onSuccess: (album) => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      toast(t("common.created"));
      onClose();
      return album;
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.albumCreate")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={create.isPending}>{t("common.cancel")}</button>
          <button className="btn-primary text-sm" onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>
            {create.isPending ? t("common.saving") : t("common.create")}
          </button>
        </>
      }
    >
      <Field label={t("announcements.fTitle")}>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label={t("feature.note")}>
        <textarea className="field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label={t("classrooms.title")}>
        <select className="field" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
          <option value="">{t("audience.ALL")}</option>
          {(classrooms.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

function UploadModal({ album, onClose }: { album: Album; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [files, setFiles] = useState<FileList | null>(null);
  const upload = useMutation({
    mutationFn: async () => {
      const picked = Array.from(files ?? []);
      const uploaded = [];
      for (const file of picked) {
        uploaded.push(await crm.media.uploadImage(file, { kind: "ALBUM" }));
      }
      return crm.albums.addPhotos(album.id, uploaded.map((m) => ({ mediaId: m.id })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      qc.invalidateQueries({ queryKey: ["album", album.id] });
      toast(t("common.saved"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.addPhotos")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={upload.isPending}>{t("common.cancel")}</button>
          <button className="btn-primary text-sm" onClick={() => upload.mutate()} disabled={!files?.length || upload.isPending}>
            {upload.isPending ? t("common.saving") : t("common.upload")}
          </button>
        </>
      }
    >
      <Field label={album.title}>
        <input className="field" type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
      </Field>
    </Modal>
  );
}

export function AlbumsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [classroomId, setClassroomId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [uploading, setUploading] = useState<Album | null>(null);
  const [removing, setRemoving] = useState<Album | null>(null);
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const albums = useLoadMore(["albums", classroomId], (pg) =>
    crm.albums.page({ classroomId: classroomId || undefined, ...pg }),
  );
  const selected = useQuery({ queryKey: ["album", selectedId], queryFn: () => crm.albums.get(selectedId!), enabled: !!selectedId });
  const remove = useMutation({
    mutationFn: (id: string) => crm.albums.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      toast(t("common.deleted"));
      setRemoving(null);
      setSelectedId(null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <PageHeader title={t("feature.albumsTitle")} section={t("feature.albumsSection")} />
      <main className="grid gap-4 p-6 lg:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          <div className="flex gap-2">
            <select className="field !py-1.5" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <option value="">{t("common.all")}</option>
              {(classrooms.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-primary text-sm" onClick={() => setCreateOpen(true)}>{t("common.create")}</button>
          </div>
          {albums.items.map((a) => (
            <button key={a.id} className="card w-full p-4 text-left hover:border-orange-200" onClick={() => setSelectedId(a.id)}>
              <div className="font-bold">{a.title}</div>
              <div className="text-sm text-slate-500">{a.classroom?.name ?? t("audience.ALL")} · {a._count?.photos ?? 0} {t("feature.photos")}</div>
              <div className="text-xs text-slate-400">{formatDate(a.createdAt)}</div>
            </button>
          ))}
          <LoadMore
            hasMore={albums.hasNextPage}
            loading={albums.isFetchingNextPage}
            onMore={() => albums.fetchNextPage()}
          />
        </section>
        <section className="card p-5">
          {!selected.data ? (
            <div className="text-sm text-slate-400">{albums.isLoading ? t("common.loading") : t("common.view")}</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selected.data.title}</h2>
                  <p className="text-sm text-slate-500">{selected.data.description}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-soft text-sm" onClick={() => setUploading(selected.data)}>{t("feature.addPhotos")}</button>
                  <button className="text-sm text-red-600" onClick={() => setRemoving(selected.data)}>{t("common.delete")}</button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(selected.data.photos ?? []).map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200">
                    <AuthImage mediaId={p.media.id} alt={p.caption ?? selected.data.title} className="h-44 w-full object-cover" />
                    {p.caption && <div className="p-2 text-sm">{p.caption}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      {createOpen && <AlbumModal onClose={() => setCreateOpen(false)} />}
      {uploading && <UploadModal album={uploading} onClose={() => setUploading(null)} />}
      <ConfirmDialog open={!!removing} title={t("common.delete")} message={removing?.title ?? ""} danger busy={remove.isPending} onClose={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing.id)} />
    </>
  );
}
