import { api } from "./http";

export type MediaKind = "REPORT_PHOTO" | "ALBUM" | "AVATAR" | "DOCUMENT" | "OTHER";
export type UploadedMedia = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
};

export function uploadImage(file: File, opts: { kind?: MediaKind; schoolId?: string } = {}) {
  const form = new FormData();
  form.append("file", file);
  return api.post<UploadedMedia>("/media", form, { query: opts });
}
