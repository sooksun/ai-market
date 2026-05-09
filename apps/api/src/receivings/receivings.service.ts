import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseRequestStatus, ReceivingStatus } from '@ai-market/db';
import type {
  FinalizeReceivingInput,
  RecordReceivingItemInput,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ReceivingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Start a receiving record for a PR. Allowed when PR is APPROVED or already
   * IN_RECEIVING (idempotent — returns existing record if already started).
   * Auto-creates ReceivingItem rows for every PR item, pre-filled with the
   * requested quantity (inspector can override).
   */
  async start(user: AuthenticatedUser, prId: string) {
    this.requireRole(user, ['INSPECTOR', 'PROCUREMENT', 'ADMIN']);
    const pr = await this.assertPrInScope(user, prId);

    const existing = await this.prisma.receivingRecord.findUnique({
      where: { purchaseRequestId: prId },
      include: {
        items: { include: { purchaseRequestItem: true } },
      },
    });
    if (existing) return existing;

    if (pr.status !== 'APPROVED' && pr.status !== 'IN_RECEIVING') {
      throw new ConflictException({
        code: 'INVALID_PR_STATE',
        message: 'เริ่มตรวจรับได้เฉพาะ PR ที่อนุมัติแล้ว (APPROVED / IN_RECEIVING)',
        details: { current: pr.status },
      });
    }

    const items = await this.prisma.purchaseRequestItem.findMany({
      where: { purchaseRequestId: prId },
      orderBy: { ordinal: 'asc' },
      select: { id: true, quantity: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.receivingRecord.create({
        data: {
          schoolId: user.schoolId,
          purchaseRequestId: prId,
          status: ReceivingStatus.IN_PROGRESS,
          inspectorIds: [user.id] as Prisma.InputJsonValue,
          items: {
            create: items.map((it) => ({
              purchaseRequestItemId: it.id,
              quantityReceived: null,
              condition: 'GOOD',
            })),
          },
        },
        include: {
          items: { include: { purchaseRequestItem: true } },
        },
      });
      if (pr.status !== 'IN_RECEIVING') {
        await tx.purchaseRequest.update({
          where: { id: prId },
          data: { status: PurchaseRequestStatus.IN_RECEIVING },
        });
      }
      return record;
    });
  }

  async getForPr(user: AuthenticatedUser, prId: string) {
    await this.assertPrInScope(user, prId);
    const record = await this.prisma.receivingRecord.findUnique({
      where: { purchaseRequestId: prId },
      include: {
        items: {
          include: {
            purchaseRequestItem: {
              select: { id: true, ordinal: true, name: true, unit: true, quantity: true },
            },
          },
          orderBy: { purchaseRequestItem: { ordinal: 'asc' } },
        },
      },
    });
    return record;
  }

  async recordItem(
    user: AuthenticatedUser,
    prId: string,
    itemId: string,
    input: RecordReceivingItemInput,
  ) {
    this.requireRole(user, ['INSPECTOR', 'PROCUREMENT', 'ADMIN']);
    const record = await this.prisma.receivingRecord.findUnique({
      where: { purchaseRequestId: prId },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'NO_RECEIVING',
        message: 'ยังไม่มีใบตรวจรับ — กดเริ่มตรวจรับก่อน',
      });
    }
    if (record.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    if (record.status !== 'IN_PROGRESS') {
      throw new ConflictException({
        code: 'RECEIVING_NOT_IN_PROGRESS',
        message: 'แก้ได้เฉพาะใบตรวจรับที่อยู่ระหว่างดำเนินการ',
        details: { current: record.status },
      });
    }

    const item = await this.prisma.receivingItem.findFirst({
      where: { receivingRecordId: record.id, id: itemId },
    });
    if (!item) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบรายการตรวจรับ' });
    }

    return this.prisma.receivingItem.update({
      where: { id: itemId },
      data: {
        quantityReceived:
          input.quantityReceived != null
            ? new Prisma.Decimal(input.quantityReceived)
            : null,
        condition: input.condition,
        conditionNotes: input.conditionNotes ?? null,
        inspectedAt: new Date(),
        inspectedById: user.id,
      },
    });
  }

  async finalize(
    user: AuthenticatedUser,
    prId: string,
    input: FinalizeReceivingInput,
  ) {
    this.requireRole(user, ['INSPECTOR', 'PROCUREMENT', 'ADMIN']);
    const record = await this.prisma.receivingRecord.findUnique({
      where: { purchaseRequestId: prId },
      include: { items: true },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'NO_RECEIVING',
        message: 'ยังไม่มีใบตรวจรับ',
      });
    }
    if (record.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    if (record.status !== 'IN_PROGRESS') {
      throw new ConflictException({
        code: 'ALREADY_FINALIZED',
        message: 'ใบตรวจรับนี้ปิดแล้ว',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.receivingRecord.update({
        where: { id: record.id },
        data: {
          status: input.decision as ReceivingStatus,
          comment: input.comment ?? null,
          finalizedAt: new Date(),
          finalizedById: user.id,
        },
      });

      // Map decision → PR status:
      // COMPLETE → RECEIVED, PARTIAL → RECEIVED (partial is still "received"),
      // REJECTED → APPROVED (revert so we can re-receive after returning to vendor)
      let prTarget: PurchaseRequestStatus | null = null;
      if (input.decision === 'COMPLETE' || input.decision === 'PARTIAL') {
        prTarget = PurchaseRequestStatus.RECEIVED;
      } else if (input.decision === 'REJECTED') {
        prTarget = PurchaseRequestStatus.APPROVED;
      }
      if (prTarget) {
        await tx.purchaseRequest.update({
          where: { id: prId },
          data: { status: prTarget },
        });
      }
      return updated;
    });
  }

  /** Inspector inbox — PRs that are APPROVED/IN_RECEIVING and need inspection. */
  async inboxForUser(user: AuthenticatedUser) {
    this.requireRole(user, ['INSPECTOR', 'PROCUREMENT', 'DIRECTOR', 'ADMIN']);
    const prs = await this.prisma.purchaseRequest.findMany({
      where: {
        schoolId: user.schoolId,
        status: { in: ['APPROVED', 'IN_RECEIVING'] },
        deletedAt: null,
      },
      orderBy: { approvedAt: 'desc' },
      select: {
        id: true,
        docNo: true,
        title: true,
        status: true,
        approvedAt: true,
        requester: { select: { id: true, fullName: true } },
        receiving: { select: { id: true, status: true, startedAt: true } },
        _count: { select: { items: true } },
      },
    });
    return prs;
  }

  // ───── Helpers ─────

  private async assertPrInScope(user: AuthenticatedUser, prId: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id: prId } });
    if (!pr || pr.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบคำขอซื้อ' });
    }
    if (pr.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return pr;
  }

  private requireRole(user: AuthenticatedUser, allowed: string[]) {
    if (!user.roles.some((r) => allowed.includes(r))) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'role ไม่อนุญาตให้ทำรายการนี้',
        details: { required: allowed, actual: user.roles },
      });
    }
  }
}
