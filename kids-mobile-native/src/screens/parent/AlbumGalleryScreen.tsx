import { Text } from "react-native";
import { Image } from "expo-image";
import { useAlbums } from "@/api/albums";
import { RoleScreen, TopBar, Card, LoadingState, EmptyState } from "@/components/ui/Primitives";

export default function AlbumGalleryScreen() {
  const query = useAlbums();
  return (
    <RoleScreen role="parent">
      <TopBar title="Album" />
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text="Chưa có album." /> : null}
      {(query.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3 gap-3">
          <Text className="font-bold text-ink">{item.title}</Text>
          {item.photos?.[0]?.media?.path ? (
            <Image source={{ uri: item.photos[0].media.path }} className="h-44 rounded-md bg-line-faint" cachePolicy="memory-disk" recyclingKey={item.id} />
          ) : null}
        </Card>
      ))}
    </RoleScreen>
  );
}
