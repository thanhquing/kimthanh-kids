import { useState } from "react";
import { useAlbumDetail, useAlbums } from "@/api/albums";
import { TopBar } from "@/components/mobile/MobileShell";
import { AuthImage } from "@/components/ui/AuthImage";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useMobileState } from "@/lib/mobileState";
import { roleBase } from "@/lib/routes";

export function AlbumGalleryPage() {
  const { t } = useT();
  const { role } = useMobileState();
  const base = roleBase(role);
  const { data: albums = [], isError, isLoading } = useAlbums();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const activeId = selectedId ?? albums[0]?.id;
  const { data: album, isLoading: albumLoading, isError: albumError } = useAlbumDetail(activeId);
  const photos = album?.photos ?? [];

  return (
    <>
      <TopBar title={t("album.title")} backTo={base} />
      {isLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {isError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("album.loadError")}</div> : null}
      {!isLoading && !isError && albums.length === 0 ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("album.empty")}</div>
      ) : null}

      {albums.length > 0 ? (
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {albums.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "chip whitespace-nowrap",
                item.id === activeId ? "bg-[color:var(--primary)] text-white" : "",
              )}
            >
              {item.title} · {t("album.photos", { count: item._count?.photos ?? 0 })}
            </button>
          ))}
        </div>
      ) : null}

      {activeId && albumLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {activeId && albumError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("album.loadError")}</div> : null}
      {album && !albumError && photos.length === 0 ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("album.noPhotos")}</div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {photos.map((photo) => (
          <AuthImage
            key={photo.id}
            mediaId={photo.media.id}
            alt={photo.caption ?? album?.title}
            className="h-32 w-full rounded-xl object-cover"
          />
        ))}
      </div>
    </>
  );
}
