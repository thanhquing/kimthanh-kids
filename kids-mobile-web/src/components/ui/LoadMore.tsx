import { useT } from "@/i18n";

export function LoadMore({
  hasMore,
  loading,
  onMore,
}: {
  hasMore: boolean;
  loading?: boolean;
  onMore: () => void;
}) {
  const { t } = useT();
  if (!hasMore) return null;
  return (
    <div className="mt-4 text-center">
      <button type="button" className="btn-soft text-sm" onClick={onMore} disabled={loading}>
        {loading ? t("common.loading") : t("common.loadMore")}
      </button>
    </div>
  );
}
