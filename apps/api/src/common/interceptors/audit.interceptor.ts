import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Prisma } from '@ai-market/db';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ACTION_KEY, type AuditOptions } from '../decorators/audit-action.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts = this.reflector.get<AuditOptions | undefined>(AUDIT_ACTION_KEY, context.getHandler());
    if (!opts) return next.handle();

    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
      body: unknown;
      ip?: string;
      headers: Record<string, string | undefined>;
    }>();

    return next.handle().pipe(
      tap((result) => {
        const entityId =
          (opts.entityIdParam && req.params[opts.entityIdParam]) ||
          (result && typeof result === 'object' && 'id' in (result as Record<string, unknown>)
            ? String((result as Record<string, unknown>).id)
            : undefined);

        // Fire-and-forget. Do not block response.
        void this.prisma.auditLog
          .create({
            data: {
              schoolId: req.user?.schoolId,
              userId: req.user?.id,
              action: opts.action,
              entityType: opts.entityType,
              entityId: entityId ?? null,
              before: Prisma.JsonNull,
              after:
                result === undefined || result === null
                  ? Prisma.JsonNull
                  : (result as Prisma.InputJsonValue),
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          })
          .catch((err: unknown) => {
            // Log only; do not surface to user.
            // eslint-disable-next-line no-console
            console.error('[AuditInterceptor] failed to write audit log:', err);
          });
      }),
    );
  }
}
