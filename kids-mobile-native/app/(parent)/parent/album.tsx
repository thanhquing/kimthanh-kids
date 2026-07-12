import { FeatureGate } from "@/components/auth/FeatureGate";
import AlbumGalleryScreen from "@/screens/parent/AlbumGalleryScreen";

export default function ParentAlbumRoute() {
  return (
    <FeatureGate featureKey="media_gallery" role="parent">
      <AlbumGalleryScreen />
    </FeatureGate>
  );
}
