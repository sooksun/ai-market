import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class BudgetSourcesService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const rows = await this.prisma.budgetSource.findMany({
      where: { schoolId: user.schoolId, active: true, deletedAt: null },
      orderBy: [{ fiscalYear: 'desc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        fiscalYear: true,
        totalAmount: true,
      },
    });
    return rows.map((r) => ({
      ...r,
      totalAmount: r.totalAmount.toString(),
    }));
  }
}
