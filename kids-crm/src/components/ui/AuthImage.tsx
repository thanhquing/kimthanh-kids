import { useEffect, useState } from "react";
import { tenantStore, tokenStore } from "@/api/http";
import { cn } from "@/lib/utils";

/**
 * Ảnh từ media của kids-api: `GET /api/media/:id/file` cần Bearer (+ x-tenant) nên không thể
 * gắn thẳng vào <img src>. Component fetch blob kèm token rồi render object URL.
 */
export function AuthImage({
  mediaId,
  alt,
  className,
}: {
  mediaId: string;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    setSrc(null);
    setFailed(false);

    const headers: Record<string, string> = {};
    if (tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;
    if (tenantStore.id) headers["x-tenant"] = tenantStore.id;

    fetch(`/api/media/${mediaId}/file`, { headers })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => !revoked && setFailed(true));

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);

  if (failed) {
    return <div className={cn("grid place-items-center bg-slate-100 text-xs text-slate-400", className)}>—</div>;
  }
  if (!src) {
    return <div className={cn("animate-pulse bg-slate-100", className)} />;
  }
  return <img src={src} alt={alt} className={className} />;
}
