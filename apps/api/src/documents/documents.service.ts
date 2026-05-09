import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@ai-market/db';
import type { UpdateDocumentTemplateInput } from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ComparisonService } from '../quotations/comparison.service';
import { handlebarsRuntime } from './handlebars-runtime';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private comparison: ComparisonService,
  ) {}

  // ─── Templates ────────────────────────────

  async listTemplates(user: AuthenticatedUser) {
    return this.prisma.documentTemplate.findMany({
      where: {
        OR: [{ schoolId: user.schoolId }, { schoolId: null }],
        active: true,
      },
      orderBy: [{ category: 'asc' }, { templateKey: 'asc' }],
      select: {
        id: true,
        templateKey: true,
        nameTh: true,
        description: true,
        category: true,
        active: true,
        version: true,
        updatedAt: true,
      },
    });
  }

  async getTemplate(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ template' });
    if (t.schoolId !== null && t.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return t;
  }

  async updateTemplate(user: AuthenticatedUser, id: string, input: UpdateDocumentTemplateInput) {
    this.requireRole(user, ['ADMIN']);
    const existing = await this.getTemplate(user, id);
    if (existing.schoolId === null) {
      throw new ConflictException({
        code: 'CANNOT_EDIT_GLOBAL',
        message: 'แก้ template global ไม่ได้ — ให้ duplicate เป็น template ของโรงเรียนก่อน',
      });
    }
    return this.prisma.documentTemplate.update({
      where: { id: existing.id },
      data: {
        ...(input.nameTh !== undefined ? { nameTh: input.nameTh } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.htmlContent !== undefined
          ? { htmlContent: input.htmlContent, version: { increment: 1 } }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        updatedById: user.id,
      },
    });
  }

  // ─── Render ────────────────────────────

  async renderForPr(user: AuthenticatedUser, prId: string, templateKey: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        templateKey,
        active: true,
        OR: [{ schoolId: user.schoolId }, { schoolId: null }],
      },
      orderBy: { schoolId: 'desc' }, // school-specific wins
    });
    if (!template) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: `ไม่พบ template "${templateKey}"`,
      });
    }

    const context = await this.buildContext(user, prId);

    let renderedHtml: string;
    try {
      const compiled = handlebarsRuntime.compile(template.htmlContent, { noEscape: false });
      renderedHtml = compiled(context);
    } catch (err) {
      throw new ConflictException({
        code: 'TEMPLATE_RENDER_ERROR',
        message: `Render template ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    const created = await this.prisma.procurementDocument.create({
      data: {
        schoolId: user.schoolId,
        templateId: template.id,
        templateKey: template.templateKey,
        templateVersion: template.version,
        refType: 'PurchaseRequest',
        refId: prId,
        docNo: context.pr?.docNo ?? null,
        title: template.nameTh,
        renderedHtml,
        contextData: this.toJsonValue(context),
        generatedById: user.id,
      },
    });
    return { id: created.id, templateKey, title: created.title, generatedAt: created.generatedAt };
  }

  async listForPr(user: AuthenticatedUser, prId: string) {
    return this.prisma.procurementDocument.findMany({
      where: {
        refType: 'PurchaseRequest',
        refId: prId,
        schoolId: user.schoolId,
      },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        templateKey: true,
        templateVersion: true,
        title: true,
        docNo: true,
        generatedAt: true,
        generatedById: true,
      },
    });
  }

  async getDocument(user: AuthenticatedUser, id: string) {
    const doc = await this.prisma.procurementDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบเอกสาร' });
    if (doc.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return doc;
  }

  // ─── Internal ────────────────────────────

  private async buildContext(user: AuthenticatedUser, prId: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: {
        school: { select: { id: true, name: true, address: true, phone: true } },
        requester: { select: { id: true, fullName: true, email: true } },
        project: { select: { id: true, code: true, name: true, fiscalYear: true } },
        budgetSource: { select: { id: true, code: true, name: true, type: true } },
        items: {
          orderBy: { ordinal: 'asc' },
          include: {
            specifications: { orderBy: { ordinal: 'asc' }, select: { key: true, value: true } },
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

    // Compute per-item line totals + grand total.
    let totalEst = new Prisma.Decimal(0);
    const items = pr.items.map((it) => {
      const q = new Prisma.Decimal(it.quantity);
      const p = it.unitPriceEst ?? new Prisma.Decimal(0);
      const line = q.times(p);
      totalEst = totalEst.plus(line);
      return {
        ordinal: it.ordinal,
        name: it.name,
        quantity: Number(q),
        unit: it.unit,
        unitPriceEst: it.unitPriceEst != null ? Number(it.unitPriceEst) : null,
        lineTotal: Number(line),
        notes: it.notes,
        specifications: it.specifications,
      };
    });

    // Build comparison data (best-effort — fail gracefully if no quotations).
    let comparison: Awaited<ReturnType<ComparisonService['build']>> | null = null;
    try {
      comparison = await this.comparison.build(user, prId);
    } catch {
      comparison = null;
    }

    const quotations = comparison?.quotations ?? [];
    const compItems = comparison?.items ?? [];
    // For each PR item × each quotation: row of cells aligned by quotation order
    const itemsWithMatrix = compItems.map((ci) => {
      const row = quotations.map((q) => {
        const cell = ci.byQuotation.find((bq) => bq.quotationId === q.id);
        return cell ?? { unitPrice: null, lineTotal: null, specMatch: '—' };
      });
      return {
        ordinal: ci.ordinal,
        name: ci.name,
        quantity: ci.quantity,
        unit: ci.unit,
        row,
      };
    });
    const selected = quotations.find((q) => q.status === 'SELECTED') ?? null;

    return {
      now: new Date(),
      school: pr.school,
      pr: {
        id: pr.id,
        docNo: pr.docNo ?? '—',
        title: pr.title,
        reason: pr.reason,
        status: pr.status,
        submittedAt: pr.submittedAt,
        approvedAt: pr.approvedAt,
        requester: pr.requester,
        project: pr.project,
        budgetSource: pr.budgetSource,
        items,
        totalEst: Number(totalEst),
      },
      // Both shapes available — comparison_table uses `quotations`+`items`(matrix),
      // evaluation_report uses `quotations`+`selected`.
      quotations: quotations.map((q) => ({
        ...q,
        grandTotal: Number(q.grandTotal),
        shippingFee: Number(q.shippingFee),
        itemsTotal: Number(q.itemsTotal),
      })),
      items: itemsWithMatrix,
      selected: selected
        ? {
            ...selected,
            grandTotal: Number(selected.grandTotal),
          }
        : null,
    };
  }

  private toJsonValue(obj: unknown): Prisma.InputJsonValue {
    // Strip Date instances → ISO strings for JSON storage.
    return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
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
