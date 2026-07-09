import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/i18n";

/** Thanh phân trang chọn-page dùng chung. Ẩn khi chỉ 1 trang và không có tổng. */
export function Pagination({
  page,
  pages,
  total,
  onPage,
  busy,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
  busy?: boolean;
}) {
  const { t } = useT();
  if (pages <= 1) {
    return total > 0 ? (
      <div className="mt-3 text-xs text-muted text-right">{t("common.totalItems", { total })}</div>
    ) : null;
  }
  return (
    <div className="mt-3 flex items-center justify-end gap-3 text-sm">
      <span className="text-xs text-muted">{t("common.totalItems", { total })}</span>
      <button
        className="inline-flex items-center gap-1 rounded-lg border border-[#f4e7e0] bg-white px-2.5 py-1.5 hover:bg-[#fff3ec] disabled:opacity-40"
        onClick={() => onPage(page - 1)}
        disabled={busy || page <= 1}
      >
        <ChevronLeft className="w-4 h-4" />
        {t("common.prev")}
      </button>
      <span className="text-xs text-muted">{t("common.pageInfo", { page, pages })}</span>
      <button
        className="inline-flex items-center gap-1 rounded-lg border border-[#f4e7e0] bg-white px-2.5 py-1.5 hover:bg-[#fff3ec] disabled:opacity-40"
        onClick={() => onPage(page + 1)}
        disabled={busy || page >= pages}
      >
        {t("common.next")}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Nút "Xem thêm" cho feed load-more. */
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
      <button className="btn-soft text-sm" onClick={onMore} disabled={loading}>
        {loading ? t("common.loading") : t("common.loadMore")}
      </button>
    </div>
  );
}
