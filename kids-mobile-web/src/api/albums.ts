import { useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type AlbumMedia = {
  id: string;
  path: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
};

export type AlbumPhoto = {
  id: string;
  caption?: string | null;
  media: AlbumMedia;
};

export type Album = {
  id: string;
  title: string;
  description?: string | null;
  classroom?: { id: string; name: string } | null;
  createdAt: string;
  _count?: { photos: number };
  photos?: AlbumPhoto[];
};

export const albumKeys = {
  all: ["albums"] as const,
  list: (classroomId?: string) => [...albumKeys.all, "list", classroomId] as const,
  detail: (id?: string) => [...albumKeys.all, "detail", id] as const,
};

export function listAlbums(classroomId?: string) {
  return api.get<Album[]>("/albums", { query: { classroomId } });
}

export function getAlbum(id: string): Promise<Album> {
  return api.get<Album>(`/albums/${id}`);
}

export function useAlbums(classroomId?: string) {
  return useQuery({ queryKey: albumKeys.list(classroomId), queryFn: () => listAlbums(classroomId) });
}

export function useAlbumDetail(id?: string) {
  return useQuery({
    queryKey: albumKeys.detail(id),
    queryFn: () => getAlbum(id!),
    enabled: !!id,
  });
}
