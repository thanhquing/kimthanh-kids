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

/** Ảnh đã chọn từ expo-image-picker — RN FormData nhận object { uri, name, type }. */
export type PickedImage = { uri: string; name: string; type: string };

/**
 * Upload 1 ảnh lên `/media` (BE nén webp + giới hạn 15MB, kiểm quota STORAGE_MB).
 * RN khác web: append object `{ uri, name, type }` thay vì Blob/File → cast tường minh.
 */
export function uploadImage(
  image: PickedImage,
  opts: { kind?: MediaKind; schoolId?: string } = {},
): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
  return api.post<UploadedMedia>("/media", form, { query: opts });
}
