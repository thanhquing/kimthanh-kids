import { FeatureGate } from "@/components/auth/FeatureGate";
import AlbumGalleryScreen from "@/screens/parent/AlbumGalleryScreen";

export default function TeacherAlbumRoute() {
  return (
    <FeatureGate featureKey="media_gallery" role="teacher">
      <AlbumGalleryScreen />
    </FeatureGate>
  );
}
