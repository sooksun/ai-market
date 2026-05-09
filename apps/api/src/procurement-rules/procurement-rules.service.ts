import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import {
  PROCUREMENT_METHOD_LABELS_TH,
  type ChecklistItem,
  type ChecklistResponse,
  type ProcurementMethod,
  type ProcurementThresholdTier,
  type RequiredDocSpec,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const FALLBACK_TIERS: ProcurementThresholdTier[] = [
  { method: 'SPECIFIC_METHOD', labelTh: 'วิธีเฉพาะเจาะจง', max: 500_000 },
  { method: 'SELECTIVE', labelTh: 'วิธีคัดเลือก', max: 5_000_000 },
  { method: 'E_BIDDING', labelTh: 'วิธีประกาศเชิญชวน (e-bidding)', max: null },
];

const FALLBACK_DOCS: Record<ProcurementMethod, RequiredDocSpec[]> = {
  SPECIFIC_METHOD: [
    { key: 'memo', labelTh: 'บันทึกข้อความ', required: true },
    { key: 'comparison_table', labelTh: 'ตารางเปรียบเทียบราคา', required: true },
    { key: 'evaluation_report', labelTh: 'รายงานพิจารณา', required: true },
  ],
  SELECTIVE: [
    { key: 'memo', labelTh: 'บันทึกข้อความ', required: true },
    { key: 'tor', labelTh: 'TOR', required: true },
    { key: 'comparison_table', labelTh: 'ตารางเปรียบเทียบราคา', required: true },
    { key: 'evaluation_report', labelTh: 'รายงานพิจารณา', required: true },
  ],
  E_BIDDING: [
    { key: 'memo', labelTh: 'บันทึกข้อความ', required: true },
    { key: 'tor', labelTh: 'TOR', required: true },
    { key: 'price_announcement', labelTh: 'ประกาศเผยแพร่', required: true },
    { key: 'evaluation_report', labelTh: 'รายงานพิจารณา', required: true },
  ],
  OTHER: [],
};

@Injectable()
export class ProcurementRulesService {
  constructor(private prisma: PrismaService) {}

  async evaluateChecklist(
    user: AuthenticatedUser,
    prId: string,
  ): Promise<ChecklistResponse> {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: {
        items: { select: { id: true, quantity: true, unitPriceEst: true } },
        quotations: {
          where: { status: 'SELECTED' },
          take: 1,
          include: {
            items: { select: { unitPrice: true, quantity: true, purchaseRequestItemId: true } },
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

    // 1) Determine the amount used to pick procurement method.
    let amount = 0;
    let amountSource: ChecklistResponse['amountSource'] = 'none';
    if (pr.quotations[0]) {
      const sel = pr.quotations[0];
      const prItemQty = new Map<string, Prisma.Decimal>(
        pr.items.map((it) => [it.id, it.quantity]),
      );
      let sum = new Prisma.Decimal(0);
      for (const qi of sel.items) {
        const qty =
          qi.quantity ??
          prItemQty.get(qi.purchaseRequestItemId) ??
          new Prisma.Decimal(0);
        sum = sum.plus(qi.unitPrice.times(qty));
      }
      amount = Number(sum.plus(sel.shippingFee));
      amountSource = 'selected_quotation';
    } else {
      const sum = pr.items.reduce((acc, it) => {
        const q = new Prisma.Decimal(it.quantity);
        const p = it.unitPriceEst ?? new Prisma.Decimal(0);
        return acc.plus(q.times(p));
      }, new Prisma.Decimal(0));
      amount = Number(sum);
      if (amount > 0) amountSource = 'items_estimate';
    }

    // 2) Load tiers + derive method.
    const tiers = await this.loadTiers(user.schoolId);
    const matched = this.deriveMethod(amount, tiers);
    const method: ProcurementMethod = matched?.method ?? 'OTHER';
    const methodLabel =
      matched?.labelTh ?? PROCUREMENT_METHOD_LABELS_TH[method];

    // 3) Load required docs for the method.
    const required = await this.loadRequiredDocs(user.schoolId, method);

    // 4) Look up which docs have already been generated for this PR.
    const generated = await this.prisma.procurementDocument.findMany({
      where: {
        refType: 'PurchaseRequest',
        refId: prId,
        templateKey: { in: required.map((d) => d.key) },
      },
      orderBy: { generatedAt: 'desc' },
      select: { id: true, templateKey: true },
    });
    const latestByKey = new Map<string, string>();
    for (const g of generated) {
      if (!latestByKey.has(g.templateKey)) latestByKey.set(g.templateKey, g.id);
    }

    // 5) Cross-check which template keys are actually available.
    const availableTemplates = await this.prisma.documentTemplate.findMany({
      where: {
        active: true,
        OR: [{ schoolId: user.schoolId }, { schoolId: null }],
        templateKey: { in: required.map((d) => d.key) },
      },
      select: { templateKey: true },
    });
    const availableKeys = new Set(availableTemplates.map((t) => t.templateKey));

    const docs: ChecklistItem[] = required.map((d) => {
      const documentId = latestByKey.get(d.key) ?? null;
      return {
        key: d.key,
        labelTh: d.labelTh,
        required: d.required,
        present: documentId !== null,
        documentId,
        templateAvailable: availableKeys.has(d.key),
      };
    });

    const totalRequired = docs.filter((d) => d.required).length;
    const totalPresent = docs.filter((d) => d.required && d.present).length;

    return {
      prId,
      amount,
      amountSource,
      method,
      methodLabel,
      matchedTier: matched
        ? { method: matched.method, labelTh: matched.labelTh, max: matched.max }
        : null,
      totalRequired,
      totalPresent,
      complete: totalRequired > 0 && totalPresent === totalRequired,
      docs,
    };
  }

  // ─── Pure helpers ─────────────────────────────────────

  deriveMethod(
    amount: number,
    tiers: ProcurementThresholdTier[],
  ): ProcurementThresholdTier | null {
    if (amount <= 0) return null;
    // Sort by ascending max; null max goes last
    const sorted = [...tiers].sort((a, b) => {
      if (a.max === null) return 1;
      if (b.max === null) return -1;
      return a.max - b.max;
    });
    for (const t of sorted) {
      if (t.max === null || amount <= t.max) return t;
    }
    return sorted[sorted.length - 1] ?? null;
  }

  async loadTiers(schoolId: string): Promise<ProcurementThresholdTier[]> {
    const rule = await this.prisma.ruleConfig.findFirst({
      where: { OR: [{ schoolId }, { schoolId: null }], key: 'procurement_thresholds' },
      orderBy: { schoolId: 'desc' },
    });
    if (!rule || !rule.value || typeof rule.value !== 'object') return FALLBACK_TIERS;
    const obj = rule.value as { tiers?: unknown };
    if (!Array.isArray(obj.tiers)) return FALLBACK_TIERS;
    const tiers: ProcurementThresholdTier[] = [];
    for (const raw of obj.tiers) {
      if (
        raw &&
        typeof raw === 'object' &&
        typeof (raw as { method: unknown }).method === 'string' &&
        typeof (raw as { labelTh: unknown }).labelTh === 'string'
      ) {
        const r = raw as { method: string; labelTh: string; max?: number | null };
        const validMethods: ProcurementMethod[] = [
          'SPECIFIC_METHOD',
          'SELECTIVE',
          'E_BIDDING',
          'OTHER',
        ];
        if (!validMethods.includes(r.method as ProcurementMethod)) continue;
        tiers.push({
          method: r.method as ProcurementMethod,
          labelTh: r.labelTh,
          max: typeof r.max === 'number' ? r.max : r.max === null ? null : null,
        });
      }
    }
    return tiers.length > 0 ? tiers : FALLBACK_TIERS;
  }

  async loadRequiredDocs(
    schoolId: string,
    method: ProcurementMethod,
  ): Promise<RequiredDocSpec[]> {
    const rule = await this.prisma.ruleConfig.findFirst({
      where: { OR: [{ schoolId }, { schoolId: null }], key: 'required_docs_by_method' },
      orderBy: { schoolId: 'desc' },
    });
    if (!rule || !rule.value || typeof rule.value !== 'object') {
      return FALLBACK_DOCS[method] ?? [];
    }
    const obj = rule.value as Record<string, unknown>;
    const list = obj[method];
    if (!Array.isArray(list)) return FALLBACK_DOCS[method] ?? [];
    const docs: RequiredDocSpec[] = [];
    for (const raw of list) {
      if (typeof raw === 'string') {
        docs.push({ key: raw, labelTh: raw, required: true });
      } else if (
        raw &&
        typeof raw === 'object' &&
        typeof (raw as { key: unknown }).key === 'string'
      ) {
        const r = raw as { key: string; labelTh?: string; required?: boolean };
        docs.push({
          key: r.key,
          labelTh: r.labelTh ?? r.key,
          required: r.required !== false,
        });
      }
    }
    return docs;
  }
}
