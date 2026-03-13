import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { RequestUser } from './request-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    return request.user;
  },
);
