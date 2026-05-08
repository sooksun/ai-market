import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Budget, type BudgetMovement } from '@ai-market/db';
import type {
  AllocateBudgetInput,
  BudgetBalance,
  UpdateBudgetAllocationInput,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

interface BudgetRow {
  id: string;
  schoolId: string;
  projectId: string;
  budgetSourceId: string;
  fiscalYear: number;
  allocated: Prisma.Decimal;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthenticatedUser, fiscalYear?: number) {
    const where: Prisma.BudgetWhereInput = { schoolId: user.schoolId };
    if (fiscalYear) where.fiscalYear = fiscalYear;
    const rows = await this.prisma.budget.findMany({
      where,
      orderBy: [{ fiscalYear: 'desc' }, { project: { code: 'asc' } }],
      include: {
        project: { select: { id: true, code: true, name: true } },
        budgetSource: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    const balances = await Promise.all(rows.map((b) => this.computeBalance(b.id)));

    return rows.map((b, i) => ({
      ...b,
      allocated: b.allocated.toString(),
      balance: balances[i],
    }));
  }

  async getById(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        project: true,
        budgetSource: true,
      },
    });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ budget' });
    if (b.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    const balance = await this.computeBalance(b.id);
    return { ...b, allocated: b.allocated.toString(), balance };
  }

  async findActiveBudget(
    schoolId: string,
    projectId: string,
    budgetSourceId: string,
  ): Promise<BudgetRow | null> {
    return this.prisma.budget.findFirst({
      where: { schoolId, projectId, budgetSourceId },
      orderBy: { fiscalYear: 'desc' },
    });
  }

  async allocate(user: AuthenticatedUser, input: AllocateBudgetInput) {
    this.requireRole(user, ['FINANCE', 'ADMIN']);

    const project = await this.prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project || project.schoolId !== user.schoolId) {
      throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'ไม่พบโครงการ' });
    }
    const source = await this.prisma.budgetSource.findUnique({
      where: { id: input.budgetSourceId },
    });
    if (!source || source.schoolId !== user.schoolId) {
      throw new NotFoundException({ code: 'SOURCE_NOT_FOUND', message: 'ไม่พบแหล่งงบ' });
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.budget.findUnique({
        where: {
          schoolId_fiscalYear_projectId_budgetSourceId: {
            schoolId: user.schoolId,
            fiscalYear: input.fiscalYear,
            projectId: input.projectId,
            budgetSourceId: input.budgetSourceId,
          },
        },
      });
      if (existing) {
        throw new ConflictException({
          code: 'BUDGET_EXISTS',
          message: 'มี allocation นี้อยู่แล้ว — ใช้ปุ่มแก้ไขแทน',
        });
      }
      const created = await tx.budget.create({
        data: {
          schoolId: user.schoolId,
          fiscalYear: input.fiscalYear,
          projectId: input.projectId,
          budgetSourceId: input.budgetSourceId,
          allocated: new Prisma.Decimal(input.amount),
          notes: input.notes ?? null,
        },
      });
      await tx.budgetMovement.create({
        data: {
          budgetId: created.id,
          type: 'ALLOCATE',
          amount: new Prisma.Decimal(input.amount),
          note: input.notes ?? 'initial allocation',
          createdById: user.id,
        },
      });
      return created;
    });
  }

  async updateAllocation(user: AuthenticatedUser, id: string, input: UpdateBudgetAllocationInput) {
    this.requireRole(user, ['FINANCE', 'ADMIN']);
    const existing = await this.prisma.budget.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== user.schoolId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ budget' });
    }
    const newAmount = new Prisma.Decimal(input.amount);
    const delta = newAmount.minus(existing.allocated);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.budget.update({
        where: { id },
        data: {
          allocated: newAmount,
          notes: input.notes ?? existing.notes,
        },
      });
      if (!delta.isZero()) {
        await tx.budgetMovement.create({
          data: {
            budgetId: id,
            type: 'ADJUST',
            amount: delta.abs(),
            note: `${delta.isPositive() ? 'increase' : 'decrease'} from ${existing.allocated} to ${newAmount}`,
            createdById: user.id,
          },
        });
      }
      return updated;
    });
  }

  async deleteAllocation(user: AuthenticatedUser, id: string) {
    this.requireRole(user, ['ADMIN']);
    const existing = await this.prisma.budget.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== user.schoolId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ budget' });
    }
    const balance = await this.computeBalance(id);
    if (balance.held !== '0' || balance.committed !== '0' || balance.spent !== '0') {
      throw new ConflictException({
        code: 'BUDGET_HAS_MOVEMENTS',
        message: 'ลบ allocation ไม่ได้ — มีการกัน/ผูกพัน/จ่ายแล้ว',
        details: balance,
      });
    }
    return this.prisma.budget.delete({ where: { id } });
  }

  // ─────────────── PR integration helpers ───────────────

  /** Place a HOLD on the matching budget for a PR. Idempotent: skips if already held. */
  async holdForPr(
    schoolId: string,
    purchaseRequestId: string,
    projectId: string,
    budgetSourceId: string,
    amount: Prisma.Decimal,
    userId?: string,
  ): Promise<{ budgetId: string; holdAmount: string } | null> {
    if (amount.lessThanOrEqualTo(0)) return null;
    const budget = await this.prisma.budget.findFirst({
      where: { schoolId, projectId, budgetSourceId },
      orderBy: { fiscalYear: 'desc' },
    });
    if (!budget) return null;

    const existing = await this.prisma.budgetMovement.findFirst({
      where: {
        budgetId: budget.id,
        type: 'HOLD',
        refType: 'PurchaseRequest',
        refId: purchaseRequestId,
      },
    });
    if (existing) return { budgetId: budget.id, holdAmount: existing.amount.toString() };

    await this.prisma.budgetMovement.create({
      data: {
        budgetId: budget.id,
        type: 'HOLD',
        amount,
        refType: 'PurchaseRequest',
        refId: purchaseRequestId,
        createdById: userId,
      },
    });
    return { budgetId: budget.id, holdAmount: amount.toString() };
  }

  /** Release any HOLD movements for a PR. Records a RELEASE movement equal to total held. */
  async releaseForPr(purchaseRequestId: string, userId?: string): Promise<number> {
    const holds = await this.prisma.budgetMovement.findMany({
      where: {
        type: 'HOLD',
        refType: 'PurchaseRequest',
        refId: purchaseRequestId,
      },
    });
    if (holds.length === 0) return 0;

    const releases = await this.prisma.budgetMovement.findMany({
      where: {
        type: 'RELEASE',
        refType: 'PurchaseRequest',
        refId: purchaseRequestId,
      },
    });

    const heldByBudget = new Map<string, Prisma.Decimal>();
    for (const h of holds) {
      heldByBudget.set(h.budgetId, (heldByBudget.get(h.budgetId) ?? new Prisma.Decimal(0)).plus(h.amount));
    }
    for (const r of releases) {
      heldByBudget.set(
        r.budgetId,
        (heldByBudget.get(r.budgetId) ?? new Prisma.Decimal(0)).minus(r.amount),
      );
    }

    let released = 0;
    for (const [budgetId, remaining] of heldByBudget) {
      if (remaining.greaterThan(0)) {
        await this.prisma.budgetMovement.create({
          data: {
            budgetId,
            type: 'RELEASE',
            amount: remaining,
            refType: 'PurchaseRequest',
            refId: purchaseRequestId,
            createdById: userId,
          },
        });
        released++;
      }
    }
    return released;
  }

  // ─────────────── Internal ───────────────

  private async computeBalance(budgetId: string): Promise<BudgetBalance> {
    const budget = await this.prisma.budget.findUniqueOrThrow({ where: { id: budgetId } });
    const sums = await this.prisma.budgetMovement.groupBy({
      by: ['type'],
      where: { budgetId },
      _sum: { amount: true },
    });
    const get = (t: string): Prisma.Decimal =>
      sums.find((s) => s.type === t)?._sum.amount ?? new Prisma.Decimal(0);

    const held = get('HOLD').minus(get('RELEASE'));
    const committed = get('COMMIT');
    const spent = get('SPEND');
    const allocated = budget.allocated;
    const available = allocated.minus(held).minus(committed).minus(spent);

    return {
      budgetId: budget.id,
      projectId: budget.projectId,
      budgetSourceId: budget.budgetSourceId,
      fiscalYear: budget.fiscalYear,
      allocated: allocated.toString(),
      held: held.toString(),
      committed: committed.toString(),
      spent: spent.toString(),
      available: available.toString(),
    };
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
