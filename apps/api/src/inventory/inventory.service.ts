import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PrismaClient, type InventoryItem } from '@ai-market/db';
import type { StockOutInput } from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

type Tx =
  | PrismaService
  | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ─── Listing ────────────────────────────

  async list(user: AuthenticatedUser, q?: { search?: string }) {
    return this.prisma.inventoryItem.findMany({
      where: {
        schoolId: user.schoolId,
        active: true,
        ...(q?.search ? { name: { contains: q.search } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        movements: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!item) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบรายการ' });
    if (item.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return item;
  }

  // ─── Mutations ────────────────────────────

  async issueOut(user: AuthenticatedUser, id: string, input: StockOutInput) {
    this.requireRole(user, ['PROCUREMENT', 'ADMIN']);
    const existing = await this.getById(user, id);
    const qty = new Prisma.Decimal(input.quantity);
    if (existing.currentQty.lessThan(qty)) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: 'จำนวนคงเหลือไม่พอ',
        details: { currentQty: existing.currentQty.toString(), requested: qty.toString() },
      });
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id },
        data: { currentQty: { decrement: qty } },
      });
      return tx.stockMovement.create({
        data: {
          schoolId: user.schoolId,
          inventoryItemId: id,
          type: 'OUT',
          quantity: qty,
          notes: input.notes ?? null,
          createdById: user.id,
        },
      });
    });
  }

  // ─── Helpers used by ReceivingsService ────────────────────────────

  /**
   * Find inventory item by (school, name, unit) or create it.
   * Used as part of the receiving → inventory hook.
   */
  async findOrCreateItem(
    tx: Tx,
    schoolId: string,
    name: string,
    unit: string,
  ): Promise<InventoryItem> {
    const existing = await tx.inventoryItem.findUnique({
      where: { schoolId_name_unit: { schoolId, name, unit } },
    });
    if (existing) return existing;
    return tx.inventoryItem.create({
      data: { schoolId, name, unit, currentQty: new Prisma.Decimal(0) },
    });
  }

  /**
   * Add stock IN movement and increment currentQty. Idempotent by ref:
   * if a IN movement already exists for the same (refType, refId), it
   * is skipped to support re-running receiving finalize without
   * doubling the stock.
   */
  async addStockIn(
    tx: Tx,
    schoolId: string,
    inventoryItemId: string,
    quantity: Prisma.Decimal,
    ref: { refType: string; refId: string; unitCost?: Prisma.Decimal | null },
    userId?: string,
  ): Promise<void> {
    const dup = await tx.stockMovement.findFirst({
      where: {
        inventoryItemId,
        type: 'IN',
        refType: ref.refType,
        refId: ref.refId,
      },
      select: { id: true },
    });
    if (dup) return;
    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { currentQty: { increment: quantity } },
    });
    await tx.stockMovement.create({
      data: {
        schoolId,
        inventoryItemId,
        type: 'IN',
        quantity,
        refType: ref.refType,
        refId: ref.refId,
        unitCost: ref.unitCost ?? null,
        createdById: userId ?? null,
      },
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
