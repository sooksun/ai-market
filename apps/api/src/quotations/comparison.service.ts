import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

export interface ComparisonRow {
  itemId: string;
  ordinal: number;
  name: string;
  unit: string;
  quantity: string;
  unitPriceEst: string | null;
  /** lowest unit price across active quotations */
  bestUnitPrice: string | null;
  /** quotation id of the best price */
  bestQuotationId: string | null;
  byQuotation: Array<{
    quotationId: string;
    unitPrice: string;
    quantity: string | null;
    specMatch: string;
    specMatchDetail: string | null;
    notes: string | null;
    /** = unitPrice × (quantity ?? PR item quantity) — without shipping */
    lineTotal: string;
  }>;
}

export interface ComparisonQuotationSummary {
  id: string;
  status: string;
  source: string;
  shippingFee: string;
  itemsTotal: string;
  grandTotal: string;
  fullySpecMatched: boolean;
  vendor: { id: string; name: string; rating: number | null; taxId: string | null };
  selectedAt: string | null;
  selectionReason: string | null;
}

export interface ComparisonResult {
  prId: string;
  docNo: string | null;
  title: string;
  status: string;
  items: ComparisonRow[];
  quotations: ComparisonQuotationSummary[];
}

@Injectable()
export class ComparisonService {
  constructor(private prisma: PrismaService) {}

  async build(user: AuthenticatedUser, prId: string): Promise<ComparisonResult> {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: {
        items: { orderBy: { ordinal: 'asc' } },
        quotations: {
          where: { status: { notIn: ['WITHDRAWN'] } },
          orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
          include: {
            vendor: { select: { id: true, name: true, rating: true, taxId: true } },
            items: true,
          },
        },
      },
    });
    if (!pr || pr.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบคำขอซื้อ' });
    }
    if (pr.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }

    // Build quotation summaries with per-item totals + grand total.
    const quotations: ComparisonQuotationSummary[] = pr.quotations.map((q) => {
      let itemsTotal = new Prisma.Decimal(0);
      let fullyMatched = q.items.length > 0;
      for (const qi of q.items) {
        const prItem = pr.items.find((it) => it.id === qi.purchaseRequestItemId);
        const qty = qi.quantity ?? prItem?.quantity ?? new Prisma.Decimal(0);
        itemsTotal = itemsTotal.plus(qi.unitPrice.times(qty));
        if (qi.specMatch !== 'FULL') fullyMatched = false;
      }
      const grand = itemsTotal.plus(q.shippingFee);
      return {
        id: q.id,
        status: q.status,
        source: q.source,
        shippingFee: q.shippingFee.toString(),
        itemsTotal: itemsTotal.toString(),
        grandTotal: grand.toString(),
        fullySpecMatched: fullyMatched,
        vendor: {
          id: q.vendor.id,
          name: q.vendor.name,
          rating: q.vendor.rating ? Number(q.vendor.rating) : null,
          taxId: q.vendor.taxId,
        },
        selectedAt: q.selectedAt?.toISOString() ?? null,
        selectionReason: q.selectionReason,
      };
    });

    // Build per-item rows with all quotations + best price.
    const items: ComparisonRow[] = pr.items.map((it) => {
      const byQuotation = pr.quotations.map((q) => {
        const qi = q.items.find((x) => x.purchaseRequestItemId === it.id);
        if (!qi) {
          return null;
        }
        const qty = qi.quantity ?? it.quantity;
        return {
          quotationId: q.id,
          unitPrice: qi.unitPrice.toString(),
          quantity: qi.quantity?.toString() ?? null,
          specMatch: qi.specMatch,
          specMatchDetail: qi.specMatchDetail,
          notes: qi.notes,
          lineTotal: qi.unitPrice.times(qty).toString(),
        };
      }).filter((x): x is NonNullable<typeof x> => x !== null);

      // best price (only consider non-rejected; here all in quotations array already exclude WITHDRAWN)
      let best: { id: string; price: Prisma.Decimal } | null = null;
      for (const q of pr.quotations) {
        if (q.status === 'REJECTED') continue;
        const qi = q.items.find((x) => x.purchaseRequestItemId === it.id);
        if (!qi) continue;
        if (!best || qi.unitPrice.lessThan(best.price)) {
          best = { id: q.id, price: qi.unitPrice };
        }
      }

      return {
        itemId: it.id,
        ordinal: it.ordinal,
        name: it.name,
        unit: it.unit,
        quantity: it.quantity.toString(),
        unitPriceEst: it.unitPriceEst?.toString() ?? null,
        bestUnitPrice: best?.price.toString() ?? null,
        bestQuotationId: best?.id ?? null,
        byQuotation,
      };
    });

    return {
      prId: pr.id,
      docNo: pr.docNo,
      title: pr.title,
      status: pr.status,
      items,
      quotations,
    };
  }
}
