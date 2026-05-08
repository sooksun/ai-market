import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import type { CreateProjectInput, UpdateProjectInput } from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  list(user: AuthenticatedUser, fiscalYear?: number) {
    return this.prisma.project.findMany({
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
        fiscalYear: true,
        active: true,
      },
    });
  }

  async getById(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.project.findUnique({ where: { id } });
    if (!p || p.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบโครงการ' });
    }
    if (p.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return p;
  }

  async create(user: AuthenticatedUser, input: CreateProjectInput) {
    this.requireRole(user, ['PROJECT_OWNER', 'FINANCE', 'ADMIN']);
    try {
      return await this.prisma.project.create({
        data: {
          schoolId: user.schoolId,
          code: input.code ?? null,
          name: input.name,
          fiscalYear: input.fiscalYear,
          active: input.active ?? true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'DUPLICATE_CODE',
          message: 'มี code โครงการนี้ในปีงบประมาณนี้แล้ว',
        });
      }
      throw err;
    }
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateProjectInput) {
    this.requireRole(user, ['PROJECT_OWNER', 'FINANCE', 'ADMIN']);
    const existing = await this.getById(user, id);
    return this.prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.fiscalYear !== undefined ? { fiscalYear: input.fiscalYear } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.requireRole(user, ['ADMIN']);
    const existing = await this.getById(user, id);
    return this.prisma.project.update({
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
