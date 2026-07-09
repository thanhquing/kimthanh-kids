// Hook "Xem thêm" (load-more) cho feed/danh sách cuộn. Bọc useInfiniteQuery, gộp items
// các trang đã tải; còn trang tiếp khi số item đã tải < meta.total.
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Page, PageParams } from "@/api/crm";

export const DEFAULT_FEED_SIZE = 20;

export function useLoadMore<T>(
  key: unknown[],
  fetcher: (params: Required<PageParams>) => Promise<Page<T>>,
  opts: { pageSize?: number; enabled?: boolean } = {},
) {
  const pageSize = opts.pageSize ?? DEFAULT_FEED_SIZE;

  const query = useInfiniteQuery({
    queryKey: [...key, "feed", pageSize],
    queryFn: ({ pageParam }) => fetcher({ page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      const total = last.meta.total ?? 0;
      return loaded < total ? all.length + 1 : undefined;
    },
    enabled: opts.enabled,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  return { ...query, items, total };
}
