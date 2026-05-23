import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

import type { ApiSuccess } from '@kimthanh/shared-types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    return next.handle().pipe(
      map((data) => {
        // Allow controllers to return already-wrapped responses (e.g. with meta).
        if (data && typeof data === 'object' && 'items' in (data as object) && 'meta' in (data as object)) {
          const paginated = data as unknown as { items: unknown; meta: ApiSuccess<T>['meta'] };
          return {
            success: true,
            data: paginated.items as T,
            meta: paginated.meta,
          };
        }
        return { success: true, data };
      }),
    );
  }
}
