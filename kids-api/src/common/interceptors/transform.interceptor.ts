import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiSuccess, Paginated } from "../http/api-response";

function isPaginated(v: unknown): v is Paginated<unknown> {
  return (
    !!v && typeof v === "object" && Array.isArray((v as Paginated<unknown>).items) && "meta" in v
  );
}

/** Bọc mọi response thành { success: true, data, meta? }. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccess<unknown>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<unknown>> {
    return next.handle().pipe(
      map((payload): ApiSuccess<unknown> => {
        if (isPaginated(payload)) {
          return { success: true, data: payload.items, meta: payload.meta };
        }
        return { success: true, data: payload ?? null };
      }),
    );
  }
}
