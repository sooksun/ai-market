import { Injectable } from '@nestjs/common';
import { Prisma, RiskSeverity, RiskType } from '@ai-market/db';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementRulesService } from '../procurement-rules/procurement-rules.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

export interface HeuristicFlagDraft {
  purchaseRequestId: string;
  itemId?: string | null;
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  detail?: Record<string, unknown>;
}

interface PrForHeuristics {
  id: string;
  schoolId: string;
  docNo: string | null;
  title: string;
  status: string;
  totalAmount: Prisma.Decimal | null;
  requesterId: string;
  projectId: string | null;
  budgetSourceId: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  items: {
    id: string;
    ordinal: number;
    name: string;
    quantity: Prisma.Decimal;
    unit: string;
    unitPriceEst: Prisma.Decimal | null;
  }[];
  quotations: {
    id: string;
    status: string;
    vendorId: string;
    grandTotal: Prisma.Decimal;
    items: {
      purchaseRequestItemId: string;
      unitPrice: Prisma.Decimal;
      quantity: Prisma.Decimal | null;
    }[];
  }[];
}

@Injectable()
export class HeuristicRulesService {
  constructor(
    private prisma: PrismaService,
    private rules: ProcurementRulesService,
  ) {}

  /**
   * Run all deterministic checks against the given PRs.
   * Returns a flat list of flag drafts (not yet persisted).
   */
  async run(user: AuthenticatedUser, prs: PrForHeuristics[]): Promise<HeuristicFlagDraft[]> {
    const flags: HeuristicFlagDraft[] = [];
    flags.push(...this.flagInsufficientQuotes(prs));
    flags.push(...this.flagPriceOutliers(prs));
    flags.push(...(await this.flagMissingDocs(user, prs)));
    flags.push(...(await this.flagNearThresholdSplit(user.schoolId, prs)));
    flags.push(...(await this.flagVendorConcentration(user.schoolId, prs)));
    return flags;
  }

  // ── 1. INSUFFICIENT_QUOTES ───────────────────────────────
  // PR ที่อยู่ในขั้นเปรียบเทียบราคาขึ้นไป ต้องมีใบเสนอราคา ≥ 3 ราย (จากหลักทั่วไป)
  private flagInsufficientQuotes(prs: PrForHeuristics[]): HeuristicFlagDraft[] {
    const COMPARING_OR_LATER = new Set([
      'IN_COMPARISON',
      'PENDING_APPROVAL',
      'APPROVED',
      'IN_RECEIVING',
      'RECEIVED',
      'CLOSED',
    ]);
    const out: HeuristicFlagDraft[] = [];
    for (const pr of prs) {
      if (!COMPARING_OR_LATER.has(pr.status)) continue;
      const submitted = pr.quotations.filter((q) => q.status !== 'CANCELLED');
      if (submitted.length >= 3) continue;
      const severity = submitted.length === 0
        ? RiskSeverity.HIGH
        : submitted.length === 1
        ? RiskSeverity.HIGH
        : RiskSeverity.MEDIUM;
      out.push({
        purchaseRequestId: pr.id,
        type: RiskType.INSUFFICIENT_QUOTES,
        severity,
        message: `มีใบเสนอราคาเพียง ${submitted.length} ราย — โดยทั่วไปต้องเปรียบเทียบ ≥ 3 ราย`,
        detail: { quotationCount: submitted.length },
      });
    }
    return out;
  }

  // ── 2. PRICE_OUTLIER (per item, intra-PR) ────────────────
  // ถ้าใบเสนอราคาในคำขอเดียวกันมีราคา item เดียวกันต่างกันมาก
  // ใช้เกณฑ์: max/min ratio >= 2.0  → MEDIUM, >= 3.0 → HIGH
  private flagPriceOutliers(prs: PrForHeuristics[]): HeuristicFlagDraft[] {
    const out: HeuristicFlagDraft[] = [];
    for (const pr of prs) {
      // group prices by purchaseRequestItemId across quotations
      const byItem = new Map<string, number[]>();
      for (const q of pr.quotations) {
        if (q.status === 'CANCELLED') continue;
        for (const qi of q.items) {
          const arr = byItem.get(qi.purchaseRequestItemId) ?? [];
          const p = Number(qi.unitPrice);
          if (Number.isFinite(p) && p > 0) arr.push(p);
          byItem.set(qi.purchaseRequestItemId, arr);
        }
      }
      const itemById = new Map<string, PrForHeuristics['items'][number]>(
        pr.items.map((it) => [it.id, it]),
      );
      for (const [itemId, prices] of byItem) {
        if (prices.length < 2) continue;
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min <= 0) continue;
        const ratio = max / min;
        if (ratio < 2) continue;
        const severity = ratio >= 3 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM;
        const item = itemById.get(itemId);
        out.push({
          purchaseRequestId: pr.id,
          itemId,
          type: RiskType.PRICE_OUTLIER,
          severity,
          message: `รายการ "${item?.name ?? itemId}" ราคาต่อหน่วยต่างกัน ${ratio.toFixed(2)} เท่า (${min.toLocaleString('th-TH')} – ${max.toLocaleString('th-TH')} บาท) — ตรวจสเปก/ผู้ขาย`,
          detail: { min, max, ratio: Number(ratio.toFixed(2)), priceCount: prices.length },
        });
      }
    }
    return out;
  }

  // ── 3. MISSING_DOC ────────────────────────────────────────
  // ใช้ ProcurementRulesService.evaluateChecklist สำหรับ PR ที่ approved/closed
  private async flagMissingDocs(
    user: AuthenticatedUser,
    prs: PrForHeuristics[],
  ): Promise<HeuristicFlagDraft[]> {
    const out: HeuristicFlagDraft[] = [];
    const NEEDS_DOCS = new Set(['APPROVED', 'IN_RECEIVING', 'RECEIVED', 'CLOSED']);
    for (const pr of prs) {
      if (!NEEDS_DOCS.has(pr.status)) continue;
      try {
        const checklist = await this.rules.evaluateChecklist(user, pr.id);
        const missing = checklist.docs.filter((d) => d.required && !d.present);
        if (missing.length === 0) continue;
        out.push({
          purchaseRequestId: pr.id,
          type: RiskType.MISSING_DOC,
          severity: missing.length >= 2 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
          message: `เอกสารที่ระเบียบกำหนดยังขาด ${missing.length} ฉบับ: ${missing.map((m) => m.labelTh).join(', ')}`,
          detail: { missing: missing.map((m) => ({ key: m.key, label: m.labelTh })), method: checklist.method },
        });
      } catch {
        // skip — not blocking
      }
    }
    return out;
  }

  // ── 4. NEAR_THRESHOLD_SPLIT ──────────────────────────────
  // PRs จาก project + budget source เดียวกันในช่วง 30 วัน รวมยอดข้าม threshold ของวิธีถัดไป
  // โดยที่แต่ละ PR ยังต่ำกว่า threshold เดี่ยว → เข้าข่ายซอย
  private async flagNearThresholdSplit(
    schoolId: string,
    prs: PrForHeuristics[],
  ): Promise<HeuristicFlagDraft[]> {
    const out: HeuristicFlagDraft[] = [];
    const tiers = await this.rules.loadTiers(schoolId);
    const sortedTiers = [...tiers].sort((a, b) => {
      if (a.max === null) return 1;
      if (b.max === null) return -1;
      return a.max - b.max;
    });
    if (sortedTiers.length === 0) return out;

    // group by (projectId|null, budgetSourceId|null), within 30-day window of each PR
    const indexed = prs.map((pr) => ({
      pr,
      amount: Number(pr.totalAmount ?? 0),
      groupKey: `${pr.projectId ?? '_'}::${pr.budgetSourceId ?? '_'}`,
      anchor: pr.submittedAt ?? pr.createdAt,
    }));

    const flagged = new Set<string>();
    for (const a of indexed) {
      if (flagged.has(a.pr.id)) continue;
      if (!a.pr.projectId && !a.pr.budgetSourceId) continue;
      // Find sibling PRs in same group within ±30d
      const siblings = indexed.filter(
        (b) =>
          b.pr.id !== a.pr.id &&
          b.groupKey === a.groupKey &&
          Math.abs(b.anchor.getTime() - a.anchor.getTime()) <= 30 * 24 * 3600 * 1000,
      );
      // also load DB siblings outside the prs scope (same project + budget source bucket)
      const dbSiblings = await this.prisma.purchaseRequest.findMany({
        where: {
          id: { not: a.pr.id, notIn: siblings.map((s) => s.pr.id) },
          schoolId,
          deletedAt: null,
          projectId: a.pr.projectId,
          budgetSourceId: a.pr.budgetSourceId,
          createdAt: {
            gte: new Date(a.anchor.getTime() - 30 * 24 * 3600 * 1000),
            lte: new Date(a.anchor.getTime() + 30 * 24 * 3600 * 1000),
          },
          status: {
            in: [
              'SUBMITTED',
              'REVIEWING',
              'APPROVED_FOR_COMPARISON',
              'IN_COMPARISON',
              'PENDING_APPROVAL',
              'APPROVED',
              'IN_RECEIVING',
              'RECEIVED',
              'CLOSED',
            ],
          },
        },
        select: { id: true, totalAmount: true, docNo: true, title: true },
      });
      const groupAmounts = [
        a.amount,
        ...siblings.map((s) => s.amount),
        ...dbSiblings.map((s) => Number(s.totalAmount ?? 0)),
      ];
      const totalGroupAmount = groupAmounts.reduce((s, x) => s + x, 0);
      // Find the lowest tier each individual amount fits, vs the tier the SUM crosses
      const aTier = this.fitTier(a.amount, sortedTiers);
      const sumTier = this.fitTier(totalGroupAmount, sortedTiers);
      if (!aTier || !sumTier) continue;
      const aLevel = sortedTiers.indexOf(aTier);
      const sumLevel = sortedTiers.indexOf(sumTier);
      const groupSize = 1 + siblings.length + dbSiblings.length;
      if (sumLevel > aLevel && groupSize >= 2) {
        flagged.add(a.pr.id);
        for (const s of siblings) flagged.add(s.pr.id);
        out.push({
          purchaseRequestId: a.pr.id,
          type: RiskType.NEAR_THRESHOLD_SPLIT,
          severity: RiskSeverity.HIGH,
          message: `คำขอที่ผูกกับงบ/โครงการเดียวกันใน 30 วัน รวม ${groupSize} ฉบับ ยอดรวม ${totalGroupAmount.toLocaleString('th-TH')} บาท ข้ามเกณฑ์วิธีจัดซื้อจาก "${aTier.labelTh}" → "${sumTier.labelTh}" — อาจเข้าข่ายซอยรายการ`,
          detail: {
            groupSize,
            totalGroupAmount,
            individualAmount: a.amount,
            tierIndividual: aTier.method,
            tierGrouped: sumTier.method,
            siblingPrIds: [
              ...siblings.map((s) => s.pr.id),
              ...dbSiblings.map((s) => s.id),
            ],
          },
        });
      }
    }
    return out;
  }

  private fitTier<T extends { max: number | null }>(amount: number, sorted: T[]): T | null {
    if (amount <= 0) return null;
    for (const t of sorted) {
      if (t.max === null || amount <= t.max) return t;
    }
    return sorted[sorted.length - 1] ?? null;
  }

  // ── 5. VENDOR_CONCENTRATION ──────────────────────────────
  // ผู้ขายรายเดียวคว้า ≥ 60% ของมูลค่าใบเสนอราคา SELECTED ใน 90 วันล่าสุด และคว้า ≥ 5 PR
  private async flagVendorConcentration(
    schoolId: string,
    prs: PrForHeuristics[],
  ): Promise<HeuristicFlagDraft[]> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const recent = await this.prisma.vendorQuotation.findMany({
      where: {
        status: 'SELECTED',
        purchaseRequest: {
          schoolId,
          deletedAt: null,
          createdAt: { gte: ninetyDaysAgo },
        },
      },
      select: {
        vendorId: true,
        shippingFee: true,
        purchaseRequestId: true,
        vendor: { select: { name: true } },
        items: {
          select: {
            unitPrice: true,
            quantity: true,
            purchaseRequestItem: { select: { quantity: true } },
          },
        },
      },
    });
    if (recent.length < 5) return [];

    const stats = new Map<
      string,
      { vendorName: string; total: number; prIds: Set<string> }
    >();
    let grandTotal = 0;
    for (const r of recent) {
      let itemsTotal = new Prisma.Decimal(0);
      for (const qi of r.items) {
        const qty =
          qi.quantity ?? qi.purchaseRequestItem?.quantity ?? new Prisma.Decimal(0);
        itemsTotal = itemsTotal.plus(qi.unitPrice.times(qty));
      }
      const amt = Number(itemsTotal.plus(r.shippingFee));
      grandTotal += amt;
      const cur = stats.get(r.vendorId) ?? {
        vendorName: r.vendor.name,
        total: 0,
        prIds: new Set<string>(),
      };
      cur.total += amt;
      cur.prIds.add(r.purchaseRequestId);
      stats.set(r.vendorId, cur);
    }
    if (grandTotal <= 0) return [];

    const out: HeuristicFlagDraft[] = [];
    const flaggedPrs = new Set<string>();
    for (const [vendorId, s] of stats) {
      const share = s.total / grandTotal;
      if (share < 0.6 || s.prIds.size < 5) continue;
      // attach the flag to PRs in the current scan that this vendor won
      for (const pr of prs) {
        if (flaggedPrs.has(pr.id)) continue;
        const wasWonByThisVendor = pr.quotations.some(
          (q) => q.status === 'SELECTED' && q.vendorId === vendorId,
        );
        if (!wasWonByThisVendor) continue;
        flaggedPrs.add(pr.id);
        out.push({
          purchaseRequestId: pr.id,
          type: RiskType.VENDOR_CONCENTRATION,
          severity: share >= 0.8 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
          message: `ผู้ขาย "${s.vendorName}" ได้รับงานในโรงเรียน ${s.prIds.size} คำขอ คิดเป็น ${(share * 100).toFixed(1)}% ของยอดรวม 90 วันล่าสุด — ตรวจการกระจายผู้ขาย`,
          detail: {
            vendorId,
            vendorName: s.vendorName,
            sharePct: Number((share * 100).toFixed(1)),
            wonPrCount: s.prIds.size,
            windowDays: 90,
          },
        });
      }
    }
    return out;
  }
}
