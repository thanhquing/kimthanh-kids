import { z } from "zod";

export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE = 10_000;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PageArgs {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function page(input: PaginationQuery = {}, defaultPageSize = MAX_PAGE_SIZE): PageArgs {
  const pageSize = Math.min(input.pageSize ?? input.limit ?? defaultPageSize, MAX_PAGE_SIZE);
  const current = input.page ?? 1;
  return {
    page: current,
    pageSize,
    skip: (current - 1) * pageSize,
    take: pageSize,
  };
}
