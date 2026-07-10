import * as ImagePicker from "expo-image-picker";
import type { PickedImage } from "@/api/media";

/**
 * Mở thư viện ảnh (xin quyền trước). Trả ảnh đã chọn hoặc `null` nếu từ chối quyền/huỷ.
 * `mediaTypes: ['images']` — dạng mới (MediaTypeOptions đã deprecated ở expo-image-picker SDK 56).
 */
export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled || !result.assets.length) return null;

  const asset = result.assets[0];
  const name = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
  const type = asset.mimeType ?? "image/jpeg";
  return { uri: asset.uri, name, type };
}
