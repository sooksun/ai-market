import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@ai-market/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('not authenticated');

    const ok = user.roles.some((r) => required.includes(r));
    if (!ok) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'role ไม่อนุญาตให้ทำรายการนี้',
        required,
        actual: user.roles,
      });
    }
    return true;
  }
}
