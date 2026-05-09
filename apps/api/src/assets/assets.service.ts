import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PrismaClient } from '@ai-market/db';
import type { UpdateAssetInput } from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

type Tx =
  | PrismaService
  | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async list(user: AuthenticatedUser, q?: { search?: string; status?: string }) {
    return this.prisma.assetRegister.findMany({
      where: {
        schoolId: user.schoolId,
        active: true,
        ...(q?.status ? { status: q.status as never } : {}),
        ...(q?.search
          ? {
              OR: [
                { name: { contains: q.search } },
                { assetNumber: { contains: q.search } },
                { serialNumber: { contains: q.search } },
              ],
            }
          : {}),
      },
      orderBy: { acquisitionDate: 'desc' },
      take: 200,
    });
  }

  async getById(user: AuthenticatedUser, id: string) {
    const asset = await this.prisma.assetRegister.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบครุภัณฑ์' });
    if (asset.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return asset;
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateAssetInput) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const existing = await this.getById(user, id);
    return this.prisma.assetRegister.update({
      where: { id: existing.id },
      data: {
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.custodianId !== undefined ? { custodianId: input.custodianId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
  }

  // ─── Helpers used by ReceivingsService ────────────────────────────

  /**
   * Register N asset rows (one per quantity unit) for a receiving item.
   * Asset numbers are auto-generated as `AS-{BE_YEAR}-{seq}` (zero-padded
   * 4 digits). Idempotent by receivingItemId: if assets already exist
   * for this receiving item, they are returned unchanged.
   */
  async registerForReceiving(
    tx: Tx,
    schoolId: string,
    receivingItemId: string,
    pr: { id: string; vendorName: string | null },
    item: { name: string; category?: string | null; unitPriceEst: Prisma.Decimal | null; quantity: number },
    acquisitionDate: Date,
  ): Promise<number> {
    const existing = await tx.assetRegister.findMany({
      where: { receivingItemId, schoolId },
      select: { id: true },
    });
    if (existing.length > 0) return existing.length;

    const buddhistYear = new Date(acquisitionDate).getFullYear() + 543;
    const yearShort = String(buddhistYear).slice(-2);

    // Find current max seq for this school+year prefix (locking via select for update isn't trivial here; rely on unique constraint to retry)
    const prefix = `AS-${yearShort}-`;
    const max = await tx.assetRegister.findFirst({
      where: { schoolId, assetNumber: { startsWith: prefix } },
      orderBy: { assetNumber: 'desc' },
      select: { assetNumber: true },
    });
    let nextSeq = 1;
    if (max?.assetNumber) {
      const tail = max.assetNumber.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!isNaN(n)) nextSeq = n + 1;
    }

    const data: Prisma.AssetRegisterCreateManyInput[] = [];
    for (let i = 0; i < item.quantity; i++) {
      const seq = String(nextSeq + i).padStart(4, '0');
      data.push({
        schoolId,
        assetNumber: `${prefix}${seq}`,
        name: item.name,
        category: item.category ?? null,
        acquisitionCost: item.unitPriceEst ?? new Prisma.Decimal(0),
        acquisitionDate,
        vendorName: pr.vendorName,
        purchaseRequestId: pr.id,
        receivingItemId,
        status: 'STORED',
      });
    }
    await tx.assetRegister.createMany({ data });
    return data.length;
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
