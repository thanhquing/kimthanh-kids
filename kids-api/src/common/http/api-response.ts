/** Envelope chuẩn cho mọi response. */
export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  [k: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Trả về dạng phân trang để TransformInterceptor tách `data` + `meta`. */
export interface Paginated<T> {
  items: T[];
  meta: ApiMeta;
}

export function paginated<T>(items: T[], meta: ApiMeta): Paginated<T> {
  return { items, meta };
}
