import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import type {
  CreateRuleConfigInput,
  UpdateRuleConfigInput,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class RuleConfigsService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.ruleConfig.findMany({
      where: { OR: [{ schoolId: user.schoolId }, { schoolId: null }] },
      orderBy: { key: 'asc' },
    });
  }

  async getById(user: AuthenticatedUser, id: string) {
    const rule = await this.prisma.ruleConfig.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ rule config' });
    }
    this.assertScope(user, rule.schoolId);
    return rule;
  }

  async create(user: AuthenticatedUser, input: CreateRuleConfigInput) {
    try {
      return await this.prisma.ruleConfig.create({
        data: {
          schoolId: user.schoolId,
          key: input.key,
          type: input.type,
          value: input.value as Prisma.InputJsonValue,
          description: input.description ?? null,
          updatedById: user.id,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'DUPLICATE_KEY',
          message: 'มี rule config key นี้อยู่แล้ว',
        });
      }
      throw err;
    }
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateRuleConfigInput) {
    const existing = await this.getById(user, id);
    return this.prisma.ruleConfig.update({
      where: { id: existing.id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.value !== undefined
          ? { value: input.value as Prisma.InputJsonValue }
          : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedById: user.id,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.getById(user, id);
    return this.prisma.ruleConfig.delete({ where: { id: existing.id } });
  }

  private assertScope(user: AuthenticatedUser, schoolId: string | null) {
    if (schoolId !== null && schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
  }
}
