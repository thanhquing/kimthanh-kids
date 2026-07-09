import type { Page, PageParams } from "@/api/http";

export async function fetchAllPages<T>(
  fetcher: (params: Required<Pick<PageParams, "page" | "pageSize">>) => Promise<Page<T>>,
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
