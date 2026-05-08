import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@ai-market/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  schoolId: string;
  roles: Role[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
