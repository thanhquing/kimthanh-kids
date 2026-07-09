// Hook phân trang server-side (page-selector). Bọc useQuery, giữ dữ liệu trang cũ khi
// chuyển trang (đỡ nhấp nháy), tự reset về trang 1 khi filter (queryKey) đổi.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Page, PageParams } from "@/api/crm";

export const DEFAULT_PAGE_SIZE = 20;

export function usePaged<T>(
  key: unknown[],
  fetcher: (params: Required<PageParams>) => Promise<Page<T>>,
  opts: { pageSize?: number; enabled?: boolean } = {},
) {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPage] = useState(1);

  // Filter đổi → về trang 1 (tránh ở trang 5 nhưng kết quả mới chỉ có 1 trang).
  const keyStr = JSON.stringify(key);
  useEffect(() => {
    setPage(1);
  }, [keyStr]);

  const query = useQuery({
    queryKey: [...key, "page", page, pageSize],
    queryFn: () => fetcher({ page, pageSize }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return { ...query, items, total, page, setPage, pages, pageSize };
}
