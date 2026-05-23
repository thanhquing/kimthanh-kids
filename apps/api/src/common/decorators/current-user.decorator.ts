import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { JwtPayload } from '@kimthanh/shared-types';

export interface RequestUser extends JwtPayload {
  id: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
