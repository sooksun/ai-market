import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import type { AuditLogQuery } from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthenticatedUser, q: AuditLogQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));

    const where: Prisma.AuditLogWhereInput = {
      schoolId: user.schoolId,
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            createdAt: {
              ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
              ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
            },
          }
        : {}),
      ...(q.q
        ? {
            OR: [
              { action: { contains: q.q } },
              { entityType: { contains: q.q } },
              { entityId: { contains: q.q } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(user: AuthenticatedUser, id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!log || log.schoolId !== user.schoolId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ audit log' });
    }
    return log;
  }
}
