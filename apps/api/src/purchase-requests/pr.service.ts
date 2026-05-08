import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseRequestStatus } from '@ai-market/db';
import {
  type CreatePurchaseRequestInput,
  type UpdatePurchaseRequestInput,
  type PurchaseRequestStatus as PrStatusType,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinessService } from '../ai/services/cloudiness.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const TRANSITIONS: Record<PrStatusType, PrStatusType[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['REVIEWING', 'CANCELLED'],
  REVIEWING: ['RETURNED', 'APPROVED_FOR_COMPARISON', 'CANCELLED'],
  RETURNED: ['SUBMITTED', 'CANCELLED'],
  APPROVED_FOR_COMPARISON: ['IN_COMPARISON', 'CANCELLED'],
  IN_COMPARISON: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'RETURNED'],
  APPROVED: ['IN_RECEIVING', 'CANCELLED'],
  REJECTED: [],
  IN_RECEIVING: ['RECEIVED'],
  RECEIVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

function assertTransition(from: PrStatusType, to: PrStatusType): void {
  const allowed = TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new ConflictException({
      code: 'INVALID_STATE_TRANSITION',
      message: `เปลี่ยนสถานะจาก ${from} เป็น ${to} ไม่ได้`,
      details: { from, to, allowed },
    });
  }
}

interface ListQuery {
  status?: string;
  q?: string;
  requesterId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class PrService {
  constructor(
    private prisma: PrismaService,
    private cloudiness: CloudinessService,
  ) {}

  async list(user: AuthenticatedUser, q: ListQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));

    const isElevated = user.roles.some((r) =>
      ['PROCUREMENT', 'DIRECTOR', 'AUDITOR', 'ADMIN'].includes(r),
    );

    const where: Prisma.PurchaseRequestWhereInput = {
      schoolId: user.schoolId,
      deletedAt: null,
      ...(isElevated ? {} : { requesterId: user.id }),
      ...(q.status ? { status: q.status as PurchaseRequestStatus } : {}),
      ...(q.requesterId && isElevated ? { requesterId: q.requesterId } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { docNo: { contains: q.q } }] } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          requester: { select: { id: true, fullName: true, email: true } },
          _count: { select: { items: true, riskFlags: true } },
        },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(user: AuthenticatedUser, id: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, email: true } },
        project: { select: { id: true, code: true, name: true, fiscalYear: true } },
        budgetSource: {
          select: { id: true, code: true, name: true, type: true, fiscalYear: true },
        },
        items: {
          orderBy: { ordinal: 'asc' },
          include: { specifications: { orderBy: { ordinal: 'asc' } } },
        },
        riskFlags: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!pr || pr.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบคำขอซื้อ' });
    }
    if (pr.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }

    const isElevated = user.roles.some((r) =>
      ['PROCUREMENT', 'DIRECTOR', 'AUDITOR', 'ADMIN'].includes(r),
    );
    if (!isElevated && pr.requesterId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'คำขอนี้ไม่ใช่ของคุณ' });
    }
    return pr;
  }

  async create(user: AuthenticatedUser, input: CreatePurchaseRequestInput) {
    await this.assertProjectAndBudgetBelongToSchool(user.schoolId, input.projectId, input.budgetSourceId);
    return this.prisma.purchaseRequest.create({
      data: {
        schoolId: user.schoolId,
        requesterId: user.id,
        title: input.title,
        reason: input.reason,
        projectId: input.projectId ?? null,
        budgetSourceId: input.budgetSourceId ?? null,
        status: PurchaseRequestStatus.DRAFT,
        items: {
          create: input.items.map((item, idx) => ({
            ordinal: idx + 1,
            name: item.name,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
            unitPriceEst:
              item.unitPriceEst !== undefined ? new Prisma.Decimal(item.unitPriceEst) : null,
            rawText: item.rawText,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });
  }

  async update(user: AuthenticatedUser, id: string, input: UpdatePurchaseRequestInput) {
    const pr = await this.getById(user, id);
    if (pr.requesterId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'คำขอนี้ไม่ใช่ของคุณ' });
    }
    if (pr.status !== 'DRAFT' && pr.status !== 'RETURNED') {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: 'แก้ไขได้เฉพาะ DRAFT หรือ RETURNED',
      });
    }

    if (input.projectId !== undefined || input.budgetSourceId !== undefined) {
      await this.assertProjectAndBudgetBelongToSchool(user.schoolId, input.projectId, input.budgetSourceId);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseRequest.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
          ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
          ...(input.budgetSourceId !== undefined
            ? { budgetSourceId: input.budgetSourceId }
            : {}),
        },
      });
      if (input.items) {
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });
        await tx.purchaseRequestItem.createMany({
          data: input.items.map((item, idx) => ({
            purchaseRequestId: id,
            ordinal: idx + 1,
            name: item.name,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
            unitPriceEst:
              item.unitPriceEst !== undefined ? new Prisma.Decimal(item.unitPriceEst) : null,
            rawText: item.rawText ?? null,
            notes: item.notes ?? null,
          })),
        });
      }
      return tx.purchaseRequest.findUniqueOrThrow({
        where: { id },
        include: { items: { orderBy: { ordinal: 'asc' } } },
      });
    });
  }

  async submit(user: AuthenticatedUser, id: string) {
    const pr = await this.getById(user, id);
    if (pr.requesterId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'คำขอนี้ไม่ใช่ของคุณ' });
    }
    assertTransition(pr.status, 'SUBMITTED');

    const docNo = pr.docNo ?? (await this.generateDocNo(pr.schoolId));

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: PurchaseRequestStatus.SUBMITTED,
        submittedAt: new Date(),
        docNo,
      },
    });

    // Fire-and-forget AI cloudiness check (does not block submit response).
    this.cloudiness.triggerBackground(id, user);

    return updated;
  }

  async dismissRiskFlag(user: AuthenticatedUser, prId: string, flagId: string, reason: string) {
    this.requireRole(user, ['PROCUREMENT', 'DIRECTOR', 'ADMIN']);
    const flag = await this.prisma.aiRiskFlag.findUnique({ where: { id: flagId } });
    if (!flag || flag.purchaseRequestId !== prId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ risk flag นี้' });
    }
    if (flag.dismissedAt) {
      throw new ConflictException({
        code: 'ALREADY_DISMISSED',
        message: 'flag นี้ถูก dismiss ไปแล้ว',
      });
    }
    return this.prisma.aiRiskFlag.update({
      where: { id: flagId },
      data: {
        dismissedById: user.id,
        dismissedAt: new Date(),
        dismissedReason: reason,
      },
    });
  }

  async claim(user: AuthenticatedUser, id: string) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const pr = await this.getById(user, id);
    assertTransition(pr.status, 'REVIEWING');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: PurchaseRequestStatus.REVIEWING },
    });
  }

  async returnForRevision(user: AuthenticatedUser, id: string, reason: string) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const pr = await this.getById(user, id);
    assertTransition(pr.status, 'RETURNED');
    return this.prisma.$transaction(async (tx) => {
      await tx.aiRiskFlag.create({
        data: {
          purchaseRequestId: id,
          type: 'OTHER',
          severity: 'MEDIUM',
          message: `ส่งกลับเพื่อแก้ไข: ${reason}`,
          modelVersion: 'human',
        },
      });
      return tx.purchaseRequest.update({
        where: { id },
        data: { status: PurchaseRequestStatus.RETURNED },
      });
    });
  }

  async approveForComparison(user: AuthenticatedUser, id: string) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const pr = await this.getById(user, id);
    assertTransition(pr.status, 'APPROVED_FOR_COMPARISON');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: PurchaseRequestStatus.APPROVED_FOR_COMPARISON },
    });
  }

  async withdraw(user: AuthenticatedUser, id: string) {
    const pr = await this.getById(user, id);
    if (pr.requesterId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'คำขอนี้ไม่ใช่ของคุณ' });
    }
    if (pr.status !== 'DRAFT' && pr.status !== 'SUBMITTED') {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: 'ถอนได้เฉพาะ DRAFT/SUBMITTED',
      });
    }
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: PurchaseRequestStatus.CANCELLED },
    });
  }

  private async assertProjectAndBudgetBelongToSchool(
    schoolId: string,
    projectId?: string | null,
    budgetSourceId?: string | null,
  ): Promise<void> {
    if (projectId) {
      const found = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!found || found.schoolId !== schoolId || found.deletedAt) {
        throw new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'ไม่พบโครงการ หรืออยู่นอกโรงเรียนของคุณ',
        });
      }
    }
    if (budgetSourceId) {
      const found = await this.prisma.budgetSource.findUnique({
        where: { id: budgetSourceId },
      });
      if (!found || found.schoolId !== schoolId || found.deletedAt) {
        throw new NotFoundException({
          code: 'BUDGET_SOURCE_NOT_FOUND',
          message: 'ไม่พบแหล่งงบ หรืออยู่นอกโรงเรียนของคุณ',
        });
      }
    }
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

  private async generateDocNo(schoolId: string): Promise<string> {
    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const yearShort = String(buddhistYear).slice(-2);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const count = await this.prisma.purchaseRequest.count({
      where: {
        schoolId,
        createdAt: { gte: yearStart },
        docNo: { not: null },
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `PR-${yearShort}-${seq}`;
  }
}
