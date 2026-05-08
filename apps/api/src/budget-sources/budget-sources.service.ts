import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import type {
  CreateBudgetSourceInput,
  UpdateBudgetSourceInput,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class BudgetSourcesService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthenticatedUser, fiscalYear?: number) {
    const rows = await this.prisma.budgetSource.findMany({
      where: {
        schoolId: user.schoolId,
        deletedAt: null,
        ...(fiscalYear ? { fiscalYear } : {}),
      },
      orderBy: [{ fiscalYear: 'desc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        fiscalYear: true,
        totalAmount: true,
        active: true,
      },
    });
    return rows.map((r) => ({ ...r, totalAmount: r.totalAmount.toString() }));
  }

  async getById(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.budgetSource.findUnique({ where: { id } });
    if (!b || b.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบแหล่งงบ' });
    }
    if (b.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return { ...b, totalAmount: b.totalAmount.toString() };
  }

  async create(user: AuthenticatedUser, input: CreateBudgetSourceInput) {
    this.requireRole(user, ['FINANCE', 'ADMIN']);
    try {
      return await this.prisma.budgetSource.create({
        data: {
          schoolId: user.schoolId,
          code: input.code ?? null,
          name: input.name,
          type: input.type,
          fiscalYear: input.fiscalYear,
          totalAmount: new Prisma.Decimal(input.totalAmount),
          active: input.active ?? true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'DUPLICATE_CODE',
          message: 'มี code แหล่งงบนี้ในปีงบประมาณนี้แล้ว',
        });
      }
      throw err;
    }
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateBudgetSourceInput) {
    this.requireRole(user, ['FINANCE', 'ADMIN']);
    const existing = await this.getById(user, id);
    return this.prisma.budgetSource.update({
      where: { id: existing.id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.fiscalYear !== undefined ? { fiscalYear: input.fiscalYear } : {}),
        ...(input.totalAmount !== undefined
          ? { totalAmount: new Prisma.Decimal(input.totalAmount) }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.requireRole(user, ['ADMIN']);
    const existing = await this.getById(user, id);
    return this.prisma.budgetSource.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), active: false },
    });
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
