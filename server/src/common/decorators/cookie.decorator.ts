import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const Cookies = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as Record<string, unknown> | undefined;

    return data ? cookies?.[data] : cookies;
  },
);
