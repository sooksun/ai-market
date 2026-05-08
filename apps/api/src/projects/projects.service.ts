import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  list(user: AuthenticatedUser) {
    return this.prisma.project.findMany({
      where: { schoolId: user.schoolId, active: true, deletedAt: null },
      orderBy: [{ fiscalYear: 'desc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        fiscalYear: true,
      },
    });
  }
}
