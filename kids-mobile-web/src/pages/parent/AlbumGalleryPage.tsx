import { TopBar } from "@/components/mobile/MobileShell";
import { roleBase } from "@/lib/routes";
import { useMobileState } from "@/lib/mobileState";
import { assets } from "@/mockData";

export function AlbumGalleryPage() {
  const { role } = useMobileState();
  const base = roleBase(role);

  return (
    <>
      <TopBar title="Album ảnh lớp" backTo={base} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[assets.heroKids, assets.teacher, assets.avatar1, assets.avatar2, assets.avatar3, assets.parent].map((src, index) => (
          <img key={src} src={src} alt={`Album ${index + 1}`} className="h-32 w-full rounded-xl object-cover" />
        ))}
      </div>
    </>
  );
}
