import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import type { CreateVendorInput, UpdateVendorInput } from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthenticatedUser, includeInactive = false) {
    const rows = await this.prisma.vendor.findMany({
      where: {
        schoolId: user.schoolId,
        deletedAt: null,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map((v) => ({
      ...v,
      rating: v.rating ? Number(v.rating) : null,
    }));
  }

  async getById(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.vendor.findUnique({ where: { id } });
    if (!v || v.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบผู้ขาย' });
    }
    if (v.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return { ...v, rating: v.rating ? Number(v.rating) : null };
  }

  async create(user: AuthenticatedUser, input: CreateVendorInput) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    return this.prisma.vendor.create({
      data: {
        schoolId: user.schoolId,
        name: input.name,
        taxId: input.taxId ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        rating: input.rating != null ? new Prisma.Decimal(input.rating) : null,
        notes: input.notes ?? null,
        active: input.active ?? true,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateVendorInput) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const existing = await this.getById(user, id);
    return this.prisma.vendor.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.rating !== undefined
          ? { rating: input.rating != null ? new Prisma.Decimal(input.rating) : null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.requireRole(user, ['ADMIN']);
    const existing = await this.getById(user, id);
    // Block delete if vendor has any non-withdrawn quotations.
    const refCount = await this.prisma.vendorQuotation.count({
      where: { vendorId: existing.id, status: { not: 'WITHDRAWN' } },
    });
    if (refCount > 0) {
      throw new ConflictException({
        code: 'VENDOR_HAS_QUOTATIONS',
        message: `ลบไม่ได้ — มีใบเสนอราคา ${refCount} ใบที่ผูกอยู่`,
      });
    }
    return this.prisma.vendor.update({
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
