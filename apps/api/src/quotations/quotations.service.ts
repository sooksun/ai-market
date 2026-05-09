import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma, PurchaseRequestStatus } from '@ai-market/db';
import type {
  CreateQuotationInput,
  UpdateQuotationInput,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const COMPARISON_STATUSES: PurchaseRequestStatus[] = [
  'APPROVED_FOR_COMPARISON',
  'IN_COMPARISON',
];

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ApprovalsService))
    private approvals: ApprovalsService,
  ) {}

  async listForPr(user: AuthenticatedUser, prId: string) {
    const pr = await this.assertPrInScope(user, prId);
    const rows = await this.prisma.vendorQuotation.findMany({
      where: { purchaseRequestId: pr.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        vendor: { select: { id: true, name: true, rating: true, taxId: true } },
        items: true,
      },
    });
    return rows.map((q) => this.serialize(q));
  }

  async getById(user: AuthenticatedUser, prId: string, qId: string) {
    await this.assertPrInScope(user, prId);
    const q = await this.prisma.vendorQuotation.findUnique({
      where: { id: qId },
      include: {
        vendor: true,
        items: { include: { purchaseRequestItem: { select: { id: true, ordinal: true, name: true, quantity: true, unit: true } } } },
      },
    });
    if (!q || q.purchaseRequestId !== prId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบใบเสนอราคา' });
    }
    return this.serialize(q);
  }

  async create(user: AuthenticatedUser, prId: string, input: CreateQuotationInput) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const pr = await this.assertPrInScope(user, prId);
    if (!COMPARISON_STATUSES.includes(pr.status)) {
      throw new ConflictException({
        code: 'INVALID_PR_STATE',
        message: 'เพิ่มใบเสนอราคาได้เฉพาะ PR ใน APPROVED_FOR_COMPARISON / IN_COMPARISON',
        details: { current: pr.status },
      });
    }

    // Validate vendor + that all referenced items belong to this PR.
    await this.assertVendor(user, input.vendorId);
    const itemIds = input.items.map((i) => i.purchaseRequestItemId);
    const validItems = await this.prisma.purchaseRequestItem.findMany({
      where: { id: { in: itemIds }, purchaseRequestId: pr.id },
      select: { id: true },
    });
    if (validItems.length !== itemIds.length) {
      throw new ConflictException({
        code: 'INVALID_ITEM_REF',
        message: 'มี item id ที่ไม่อยู่ใน PR นี้',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.vendorQuotation.create({
        data: {
          schoolId: user.schoolId,
          purchaseRequestId: pr.id,
          vendorId: input.vendorId,
          source: input.source,
          shippingFee: new Prisma.Decimal(input.shippingFee ?? 0),
          notes: input.notes ?? null,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          submittedAt: new Date(),
          status: 'SUBMITTED',
        },
      });
      await tx.quotationItem.createMany({
        data: input.items.map((it) => ({
          quotationId: created.id,
          purchaseRequestItemId: it.purchaseRequestItemId,
          unitPrice: new Prisma.Decimal(it.unitPrice),
          quantity: it.quantity != null ? new Prisma.Decimal(it.quantity) : null,
          specMatch: it.specMatch,
          specMatchDetail: it.specMatchDetail ?? null,
          notes: it.notes ?? null,
        })),
      });

      // Auto-advance PR to IN_COMPARISON when first quotation arrives.
      if (pr.status === 'APPROVED_FOR_COMPARISON') {
        await tx.purchaseRequest.update({
          where: { id: pr.id },
          data: { status: PurchaseRequestStatus.IN_COMPARISON },
        });
      }
      return created;
    });
  }

  async update(
    user: AuthenticatedUser,
    prId: string,
    qId: string,
    input: UpdateQuotationInput,
  ) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const existing = await this.prisma.vendorQuotation.findUnique({ where: { id: qId } });
    if (!existing || existing.purchaseRequestId !== prId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบใบเสนอราคา' });
    }
    if (existing.status === 'SELECTED') {
      throw new ConflictException({
        code: 'CANNOT_EDIT_SELECTED',
        message: 'ใบเสนอราคาที่เลือกไปแล้วแก้ไม่ได้ — ต้องเลือกใหม่ก่อน',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorQuotation.update({
        where: { id: qId },
        data: {
          ...(input.vendorId !== undefined ? { vendorId: input.vendorId } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.shippingFee !== undefined
            ? { shippingFee: new Prisma.Decimal(input.shippingFee) }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.validUntil !== undefined
            ? { validUntil: input.validUntil ? new Date(input.validUntil) : null }
            : {}),
        },
      });
      if (input.items) {
        await tx.quotationItem.deleteMany({ where: { quotationId: qId } });
        await tx.quotationItem.createMany({
          data: input.items.map((it) => ({
            quotationId: qId,
            purchaseRequestItemId: it.purchaseRequestItemId,
            unitPrice: new Prisma.Decimal(it.unitPrice),
            quantity: it.quantity != null ? new Prisma.Decimal(it.quantity) : null,
            specMatch: it.specMatch,
            specMatchDetail: it.specMatchDetail ?? null,
            notes: it.notes ?? null,
          })),
        });
      }
      return updated;
    });
  }

  async withdraw(user: AuthenticatedUser, prId: string, qId: string) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const existing = await this.prisma.vendorQuotation.findUnique({ where: { id: qId } });
    if (!existing || existing.purchaseRequestId !== prId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบใบเสนอราคา' });
    }
    if (existing.status === 'SELECTED') {
      throw new ConflictException({
        code: 'CANNOT_WITHDRAW_SELECTED',
        message: 'ใบเสนอราคาที่เลือกแล้วถอนไม่ได้',
      });
    }
    return this.prisma.vendorQuotation.update({
      where: { id: qId },
      data: { status: 'WITHDRAWN' },
    });
  }

  async select(
    user: AuthenticatedUser,
    prId: string,
    qId: string,
    reason: string,
  ) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);

    const target = await this.prisma.vendorQuotation.findUnique({ where: { id: qId } });
    if (!target || target.purchaseRequestId !== prId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบใบเสนอราคา' });
    }

    // Idempotent: if the target is already SELECTED, return it without re-running
    // the transaction or restarting the workflow. Handles double-clicks and
    // duplicate-submit retries cleanly.
    if (target.status === 'SELECTED') {
      return target;
    }

    const pr = await this.assertPrInScope(user, prId);
    if (!COMPARISON_STATUSES.includes(pr.status)) {
      throw new ConflictException({
        code: 'INVALID_PR_STATE',
        message: 'เลือกใบเสนอราคาได้เฉพาะ PR ใน APPROVED_FOR_COMPARISON / IN_COMPARISON',
        details: { current: pr.status },
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Mark all other quotations as REJECTED.
      await tx.vendorQuotation.updateMany({
        where: {
          purchaseRequestId: prId,
          id: { not: qId },
          status: { notIn: ['WITHDRAWN', 'REJECTED'] },
        },
        data: { status: 'REJECTED' },
      });
      const updated = await tx.vendorQuotation.update({
        where: { id: qId },
        data: {
          status: 'SELECTED',
          selectedAt: new Date(),
          selectedById: user.id,
          selectionReason: reason,
        },
      });
      await tx.purchaseRequest.update({
        where: { id: prId },
        data: { status: PurchaseRequestStatus.PENDING_APPROVAL },
      });
      return updated;
    });

    // Auto-start approval workflow once vendor selection is confirmed.
    try {
      await this.approvals.start(user.schoolId, prId);
    } catch (err) {
      this.logger.warn(
        `auto-start workflow failed for PR ${prId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return result;
  }

  // ───────────────── Helpers ─────────────────

  private async assertPrInScope(user: AuthenticatedUser, prId: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: prId },
    });
    if (!pr || pr.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบคำขอซื้อ' });
    }
    if (pr.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return pr;
  }

  private async assertVendor(user: AuthenticatedUser, vendorId: string) {
    const v = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!v || v.deletedAt || v.schoolId !== user.schoolId) {
      throw new NotFoundException({ code: 'VENDOR_NOT_FOUND', message: 'ไม่พบผู้ขาย' });
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

  private serialize(q: { items?: { unitPrice: Prisma.Decimal; quantity: Prisma.Decimal | null }[]; shippingFee: Prisma.Decimal } & Record<string, unknown>) {
    return {
      ...q,
      shippingFee: q.shippingFee.toString(),
      items: q.items?.map((it) => ({
        ...it,
        unitPrice: it.unitPrice.toString(),
        quantity: it.quantity?.toString() ?? null,
      })),
    };
  }
}
