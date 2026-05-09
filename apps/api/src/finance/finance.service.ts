import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseRequestStatus, VoucherStatus } from '@ai-market/db';
import type {
  CancelVoucherInput,
  IssueVoucherInput,
  PayVoucherInput,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from '../budgets/budgets.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private prisma: PrismaService,
    private budgets: BudgetsService,
  ) {}

  // ─── Voucher creation / lookup ────────────────────────────

  /**
   * Find or create a voucher for a PR. Auto-called when finance opens
   * the voucher page for a RECEIVED PR. Total comes from selected
   * quotation's grandTotal, falling back to PR items × unitPriceEst.
   */
  async ensureForPr(user: AuthenticatedUser, prId: string) {
    this.requireRole(user, ['FINANCE', 'PROCUREMENT', 'DIRECTOR', 'ADMIN']);
    const pr = await this.assertPrInScope(user, prId);
    const existing = await this.prisma.financeVoucher.findUnique({
      where: { purchaseRequestId: prId },
    });
    if (existing) return existing;

    if (
      pr.status !== 'RECEIVED' &&
      pr.status !== 'APPROVED' &&
      pr.status !== 'IN_RECEIVING'
    ) {
      throw new ConflictException({
        code: 'INVALID_PR_STATE',
        message: 'สร้างใบสำคัญได้เฉพาะ PR ที่อนุมัติแล้ว',
        details: { current: pr.status },
      });
    }

    // Compute total amount: prefer SELECTED quotation grandTotal.
    const sel = await this.prisma.vendorQuotation.findFirst({
      where: { purchaseRequestId: prId, status: 'SELECTED' },
      include: { items: true },
    });
    let total: Prisma.Decimal;
    if (sel) {
      const itemsSum = sel.items.reduce((acc, qi) => {
        const qty = qi.quantity ?? new Prisma.Decimal(0);
        return acc.plus(qi.unitPrice.times(qty));
      }, new Prisma.Decimal(0));
      total = itemsSum.plus(sel.shippingFee);
      // Fallback to PR item quantity if quotation didn't override.
      if (itemsSum.isZero()) {
        const items = await this.prisma.purchaseRequestItem.findMany({
          where: { purchaseRequestId: prId },
          select: { id: true, quantity: true },
        });
        const qtyMap = new Map(items.map((it) => [it.id, it.quantity]));
        const recomputed = sel.items.reduce((acc, qi) => {
          const qty =
            qi.quantity ?? qtyMap.get(qi.purchaseRequestItemId) ?? new Prisma.Decimal(0);
          return acc.plus(qi.unitPrice.times(qty));
        }, new Prisma.Decimal(0));
        total = recomputed.plus(sel.shippingFee);
      }
    } else {
      const items = await this.prisma.purchaseRequestItem.findMany({
        where: { purchaseRequestId: prId },
        select: { quantity: true, unitPriceEst: true },
      });
      total = items.reduce((acc, it) => {
        const q = new Prisma.Decimal(it.quantity);
        const p = it.unitPriceEst ?? new Prisma.Decimal(0);
        return acc.plus(q.times(p));
      }, new Prisma.Decimal(0));
    }

    return this.prisma.financeVoucher.create({
      data: {
        schoolId: user.schoolId,
        purchaseRequestId: prId,
        totalAmount: total,
        status: VoucherStatus.PENDING,
      },
    });
  }

  async getForPr(user: AuthenticatedUser, prId: string) {
    await this.assertPrInScope(user, prId);
    return this.prisma.financeVoucher.findUnique({
      where: { purchaseRequestId: prId },
    });
  }

  async getById(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.financeVoucher.findUnique({
      where: { id },
      include: {
        purchaseRequest: {
          select: {
            id: true,
            docNo: true,
            title: true,
            status: true,
            requester: { select: { id: true, fullName: true } },
            project: { select: { name: true, fiscalYear: true } },
            budgetSource: { select: { name: true, type: true } },
          },
        },
      },
    });
    if (!v) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบใบสำคัญ' });
    if (v.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return v;
  }

  // ─── State transitions ────────────────────────────

  async issue(user: AuthenticatedUser, prId: string, input: IssueVoucherInput) {
    this.requireRole(user, ['FINANCE', 'ADMIN']);
    const v = await this.ensureForPr(user, prId);
    if (v.status !== 'PENDING') {
      throw new ConflictException({
        code: 'INVALID_VOUCHER_STATE',
        message: `ออกเลขได้เฉพาะใบที่ยังไม่ได้ออก — สถานะปัจจุบัน ${v.status}`,
      });
    }
    return this.prisma.financeVoucher.update({
      where: { id: v.id },
      data: {
        voucherNumber: input.voucherNumber,
        notes: input.notes ?? v.notes,
        status: VoucherStatus.ISSUED,
        issuedAt: new Date(),
        issuedById: user.id,
      },
    });
  }

  async pay(user: AuthenticatedUser, prId: string, input: PayVoucherInput) {
    this.requireRole(user, ['FINANCE', 'ADMIN']);
    const v = await this.prisma.financeVoucher.findUnique({
      where: { purchaseRequestId: prId },
    });
    if (!v) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบใบสำคัญ' });
    if (v.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    if (v.status !== 'ISSUED') {
      throw new ConflictException({
        code: 'INVALID_VOUCHER_STATE',
        message: `จ่ายได้เฉพาะใบที่ออกเลขแล้ว — สถานะปัจจุบัน ${v.status}`,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.financeVoucher.update({
        where: { id: v.id },
        data: {
          status: VoucherStatus.PAID,
          paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
          paidById: user.id,
          paymentMethod: input.paymentMethod,
          paymentRef: input.paymentRef ?? null,
          notes: input.notes ?? v.notes,
        },
      });
      await tx.purchaseRequest.update({
        where: { id: prId },
        data: { status: PurchaseRequestStatus.CLOSED, closedAt: new Date() },
      });
      return updated;
    });

    // Outside the tx: record SPEND budget movement.
    try {
      await this.budgets.spendForPr(prId, v.totalAmount, user.id);
    } catch (err) {
      this.logger.warn(
        `budget SPEND failed after voucher payment for PR ${prId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return result;
  }

  async cancel(user: AuthenticatedUser, prId: string, input: CancelVoucherInput) {
    this.requireRole(user, ['FINANCE', 'ADMIN']);
    const v = await this.prisma.financeVoucher.findUnique({
      where: { purchaseRequestId: prId },
    });
    if (!v) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบใบสำคัญ' });
    if (v.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    if (v.status === 'PAID' || v.status === 'CANCELLED') {
      throw new ConflictException({
        code: 'INVALID_VOUCHER_STATE',
        message: 'ยกเลิกใบสำคัญที่จ่ายแล้ว/ยกเลิกแล้วไม่ได้',
      });
    }
    return this.prisma.financeVoucher.update({
      where: { id: v.id },
      data: {
        status: VoucherStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: user.id,
        cancelReason: input.reason,
      },
    });
  }

  // ─── Inbox ────────────────────────────

  async inbox(user: AuthenticatedUser) {
    this.requireRole(user, ['FINANCE', 'DIRECTOR', 'ADMIN']);
    return this.prisma.purchaseRequest.findMany({
      where: {
        schoolId: user.schoolId,
        deletedAt: null,
        status: { in: ['RECEIVED', 'APPROVED', 'IN_RECEIVING', 'CLOSED'] },
      },
      orderBy: { approvedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        docNo: true,
        title: true,
        status: true,
        approvedAt: true,
        closedAt: true,
        requester: { select: { id: true, fullName: true } },
        voucher: {
          select: {
            id: true,
            status: true,
            voucherNumber: true,
            totalAmount: true,
            paidAt: true,
          },
        },
      },
    });
  }

  // ─── Helpers ────────────────────────────

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
