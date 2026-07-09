import type { Page, PageParams } from "@/api/crm";

/**
 * Lấy TẤT CẢ item qua nhiều trang (dùng cho export CSV — cần đầy đủ dữ liệu bất kể
 * đang xem trang nào). Chạy tuần tự theo meta.total; chặn trần an toàn 200 trang.
 */
export async function fetchAllPages<T>(
  fetcher: (params: Required<PageParams>) => Promise<Page<T>>,
  pageSize = 100,
): Promise<T[]> {
  const first = await fetcher({ page: 1, pageSize });
  const total = first.meta.total ?? first.items.length;
  const out = [...first.items];
  const pages = Math.min(Math.ceil(total / pageSize), 200);
  for (let p = 2; p <= pages; p++) {
    const next = await fetcher({ page: p, pageSize });
    out.push(...next.items);
  }
  return out;
}
