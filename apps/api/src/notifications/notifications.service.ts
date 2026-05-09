import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@ai-market/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

export interface NotifyInput {
  schoolId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  refType?: string | null;
  refId?: string | null;
  actorId?: string | null;
  /** Suppress if there's already an unread notification with same userId+type+refId. */
  dedupeOnUnread?: boolean;
  /** Optional Prisma transaction client. */
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a notification. Best-effort — caller should not fail their own
   * mutation if a notification can't be written, so callers usually wrap
   * this in a try/catch and log only.
   */
  async notify(input: NotifyInput) {
    const client = input.tx ?? this.prisma;

    if (input.dedupeOnUnread && input.refId) {
      const existing = await client.notification.findFirst({
        where: {
          userId: input.userId,
          type: input.type,
          refId: input.refId,
          readAt: null,
        },
        select: { id: true },
      });
      if (existing) return existing;
    }

    return client.notification.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
        actorId: input.actorId ?? null,
      },
    });
  }

  /** Fire-and-forget convenience that swallows errors. */
  notifySafe(input: NotifyInput): void {
    void this.notify(input).catch((err) => {
      this.logger.warn(
        `notify failed (user=${input.userId} type=${input.type}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  async list(user: AuthenticatedUser, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    const limit = Math.min(opts.limit ?? 30, 100);
    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
    };
    if (opts.unreadOnly) where.readAt = null;
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(user: AuthenticatedUser) {
    return this.prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });
  }

  async markRead(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบการแจ้งเตือน' });
    }
    if (row.userId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ไม่ใช่การแจ้งเตือนของคุณ' });
    }
    if (row.readAt) return row;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }
}
