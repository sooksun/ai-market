import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RiskSeverity, RiskType } from '@ai-market/db';
import {
  AuditScanAiToolOutputSchema,
  type AuditScanInput,
  type AuditScanResponse,
  type AuditScanFlag,
  type AuditFlagsQuery,
} from '@ai-market/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../ai/llm.service';
import { BASE_SYSTEM_PROMPT_TH } from '../ai/prompts/base-system';
import {
  AUDIT_SCAN_FEW_SHOT_TH,
  auditScanTool,
} from '../ai/prompts/audit-scan.v1';
import { PROMPT_VERSIONS } from '../ai/prompts/registry';
import { AiInvocationService } from '../ai/ai-invocation.service';
import { HeuristicRulesService, type HeuristicFlagDraft } from './heuristic-rules.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const HEURISTIC_VERSION = 'audit-heuristic@v1';
const MAX_PRS_PER_SCAN = 50;

interface PrShape {
  id: string;
  docNo: string | null;
  title: string;
  reason: string;
  status: string;
  totalAmount: Prisma.Decimal | null;
  submittedAt: Date | null;
  requesterId: string;
  items: {
    id: string;
    ordinal: number;
    name: string;
    quantity: Prisma.Decimal;
    unit: string;
    specifications: { key: string; value: string }[];
  }[];
  quotations: {
    status: string;
    vendor: { name: string };
    grandTotal: Prisma.Decimal;
  }[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    private heuristics: HeuristicRulesService,
    private invocations: AiInvocationService,
    private llm: LlmService,
  ) {}

  async scan(
    user: AuthenticatedUser,
    input: AuditScanInput,
  ): Promise<AuditScanResponse> {
    const where: Prisma.PurchaseRequestWhereInput = {
      schoolId: user.schoolId,
      deletedAt: null,
    };
    if (input.prIds && input.prIds.length > 0) {
      where.id = { in: input.prIds };
    }
    if (input.dateFrom || input.dateTo) {
      where.createdAt = {};
      if (input.dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(input.dateFrom);
      if (input.dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(input.dateTo);
    }
    if (input.statuses && input.statuses.length > 0) {
      where.status = { in: input.statuses as never };
    }

    const rawPrs = await this.prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_PRS_PER_SCAN,
      include: {
        items: {
          orderBy: { ordinal: 'asc' },
          select: {
            id: true,
            ordinal: true,
            name: true,
            quantity: true,
            unit: true,
            unitPriceEst: true,
            specifications: { select: { key: true, value: true } },
          },
        },
        quotations: {
          select: {
            id: true,
            status: true,
            vendorId: true,
            shippingFee: true,
            vendor: { select: { name: true } },
            items: {
              select: {
                purchaseRequestItemId: true,
                unitPrice: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    // compute grandTotal per quotation for downstream services
    const itemQtyByPrItemId = new Map<string, Prisma.Decimal>();
    for (const pr of rawPrs) {
      for (const it of pr.items) itemQtyByPrItemId.set(it.id, it.quantity);
    }
    const prs = rawPrs.map((pr) => ({
      ...pr,
      quotations: pr.quotations.map((q) => {
        let itemsTotal = new Prisma.Decimal(0);
        for (const qi of q.items) {
          const qty = qi.quantity ?? itemQtyByPrItemId.get(qi.purchaseRequestItemId) ?? new Prisma.Decimal(0);
          itemsTotal = itemsTotal.plus(qi.unitPrice.times(qty));
        }
        return {
          ...q,
          grandTotal: itemsTotal.plus(q.shippingFee),
        };
      }),
    }));

    // Empty scope → record the scan attempt with zero counts and return
    // an empty result. Returning 404 here was confusing for users who just
    // ran a scan on a date range that happens to have no matching PRs.
    if (prs.length === 0) {
      const scan = await this.prisma.auditScan.create({
        data: {
          schoolId: user.schoolId,
          ranById: user.id,
          scope: (input as unknown) as Prisma.InputJsonValue,
          prCount: 0,
          flagCount: 0,
          aiInvocationId: null,
          notes: 'ไม่พบคำขอซื้อในขอบเขตที่เลือก',
        },
      });
      return {
        scanId: scan.id,
        prCount: 0,
        flagCount: 0,
        aiInvocationId: null,
        flags: [],
        bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        byType: {},
        notes: scan.notes,
      };
    }

    // 1) Heuristic pass.
    const heuristicFlags = await this.heuristics.run(user, prs);

    // 2) Optional AI qualitative pass.
    let aiInvocationId: string | null = null;
    let aiSummary: string | null = null;
    let aiFlags: HeuristicFlagDraft[] = [];
    if (input.useAi !== false && this.llm.isConfigured()) {
      try {
        const aiResult = await this.runAi(user, prs);
        aiInvocationId = aiResult.invocationId;
        aiSummary = aiResult.summary;
        aiFlags = aiResult.flags;
      } catch (err) {
        this.logger.warn(
          `AI audit pass failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 3) Persist scan + flags in one transaction.
    const result = await this.prisma.$transaction(async (tx) => {
      const scan = await tx.auditScan.create({
        data: {
          schoolId: user.schoolId,
          ranById: user.id,
          scope: (input as unknown) as Prisma.InputJsonValue,
          prCount: prs.length,
          flagCount: heuristicFlags.length + aiFlags.length,
          aiInvocationId,
          notes: aiSummary,
        },
      });

      const allFlags: HeuristicFlagDraft[] = [...heuristicFlags, ...aiFlags];
      const created: AuditScanFlag[] = [];
      let dedupedSkipped = 0;
      for (const f of allFlags) {
        // Dedup: skip if there's already an unread (un-dismissed) flag of the
        // same (PR, item, type) from a previous scan. Re-running the same
        // scope shouldn't pile up identical findings on the open-flags inbox.
        const dup = await tx.aiRiskFlag.findFirst({
          where: {
            purchaseRequestId: f.purchaseRequestId,
            itemId: f.itemId ?? null,
            type: f.type,
            dismissedAt: null,
          },
          select: { id: true },
        });
        if (dup) {
          dedupedSkipped += 1;
          continue;
        }

        const row = await tx.aiRiskFlag.create({
          data: {
            purchaseRequestId: f.purchaseRequestId,
            itemId: f.itemId ?? null,
            auditScanId: scan.id,
            type: f.type,
            severity: f.severity,
            message: f.message,
            detail: (f.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            modelVersion: aiFlags.includes(f)
              ? PROMPT_VERSIONS.AUDIT_SCAN
              : HEURISTIC_VERSION,
            invocationId: aiFlags.includes(f) ? aiInvocationId : null,
          },
        });
        created.push({
          id: row.id,
          purchaseRequestId: row.purchaseRequestId,
          itemId: row.itemId,
          type: row.type,
          severity: row.severity,
          message: row.message,
          detail: (row.detail ?? undefined) as unknown,
          modelVersion: row.modelVersion,
          createdAt: row.createdAt.toISOString(),
        });
      }

      // refresh flag count to reflect only newly-created (non-deduped) flags
      await tx.auditScan.update({
        where: { id: scan.id },
        data: { flagCount: created.length },
      });

      if (dedupedSkipped > 0) {
        this.logger.log(
          `audit scan ${scan.id}: ${created.length} new flag(s), ${dedupedSkipped} deduped against existing unread`,
        );
      }
      return { scan, flags: created };
    });

    const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<RiskSeverity, number>;
    const byType: Record<string, number> = {};
    for (const f of result.flags) {
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      byType[f.type] = (byType[f.type] ?? 0) + 1;
    }

    return {
      scanId: result.scan.id,
      prCount: result.scan.prCount,
      flagCount: result.flags.length,
      aiInvocationId,
      flags: result.flags,
      bySeverity: bySeverity as unknown as { HIGH: number; MEDIUM: number; LOW: number },
      byType,
      notes: aiSummary,
    };
  }

  // ── AI qualitative pass ───────────────────────────────────
  private async runAi(
    user: AuthenticatedUser,
    prs: PrShape[],
  ): Promise<{ invocationId: string; summary: string; flags: HeuristicFlagDraft[] }> {
    const startedAt = Date.now();
    const promptVersion = PROMPT_VERSIONS.AUDIT_SCAN;
    const model = this.llm.defaultModel;

    const typed = prs;
    const payload = typed.map((pr) => ({
      prId: pr.id,
      docNo: pr.docNo,
      title: pr.title,
      reason: pr.reason.slice(0, 600),
      status: pr.status,
      requesterId: pr.requesterId,
      submittedAt: pr.submittedAt?.toISOString() ?? null,
      totalAmount: pr.totalAmount ? Number(pr.totalAmount) : null,
      items: pr.items.map((it) => ({
        ordinal: it.ordinal,
        name: it.name,
        quantity: Number(it.quantity),
        unit: it.unit,
        specifications: it.specifications.slice(0, 8).map((s) => ({
          key: s.key,
          value: s.value.length > 200 ? s.value.slice(0, 200) + '…' : s.value,
        })),
      })),
      quotations: pr.quotations.map((q) => ({
        status: q.status,
        vendorName: q.vendor.name,
        grandTotal: Number(q.grandTotal),
      })),
    }));

    const userMessage = `ตรวจชุดคำขอซื้อต่อไปนี้ (${typed.length} ฉบับ) แบบเชิงคุณภาพ:

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

โปรดเรียก tool flag_risks`;

    try {
      const result = await this.llm.callTool({
        model,
        maxTokens: 3072,
        systemBlocks: [BASE_SYSTEM_PROMPT_TH, AUDIT_SCAN_FEW_SHOT_TH],
        userMessage,
        tool: auditScanTool,
      });

      const parsed = AuditScanAiToolOutputSchema.safeParse(result.toolInput);
      if (!parsed.success) {
        await this.invocations.log({
          user,
          endpoint: 'ai.audit_scan',
          model: result.model,
          promptVersion,
          input: { prCount: typed.length },
          output: result.toolInput,
          tokenInput: result.tokenInput,
          tokenOutput: result.tokenOutput,
          latencyMs: Date.now() - startedAt,
          status: 'error',
          errorMessage: `schema validation failed: ${parsed.error.message}`,
        });
        throw new BadGatewayException({
          code: 'AI_PROVIDER_ERROR',
          message: 'AI ตอบกลับโครงสร้างไม่ถูกต้อง',
        });
      }

      const invocation = await this.invocations.log({
        user,
        endpoint: 'ai.audit_scan',
        model: result.model,
        promptVersion,
        input: { prCount: typed.length, prIds: typed.map((p) => p.id) },
        output: parsed.data,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        latencyMs: Date.now() - startedAt,
        status: 'success',
      });

      // Map AI flags → HeuristicFlagDraft (using prId + ordinal)
      const validPrIds = new Set(typed.map((p) => p.id));
      const itemByOrdinal = new Map<string, Map<number, string>>();
      for (const pr of typed) {
        const m = new Map<number, string>();
        for (const it of pr.items) m.set(it.ordinal, it.id);
        itemByOrdinal.set(pr.id, m);
      }
      const flags: HeuristicFlagDraft[] = [];
      for (const f of parsed.data.flags) {
        if (!validPrIds.has(f.prId)) continue;
        const itemId =
          f.itemOrdinal != null
            ? itemByOrdinal.get(f.prId)?.get(f.itemOrdinal) ?? null
            : null;
        flags.push({
          purchaseRequestId: f.prId,
          itemId,
          type: this.mapAiType(f.type),
          severity: this.mapSeverity(f.severity),
          message: f.message,
          detail: f.suggestion ? { suggestion: f.suggestion } : undefined,
        });
      }

      return { invocationId: invocation.id, summary: parsed.data.summary, flags };
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      await this.invocations
        .log({
          user,
          endpoint: 'ai.audit_scan',
          model,
          promptVersion,
          input: { prCount: typed.length },
          output: null,
          latencyMs: Date.now() - startedAt,
          status: 'error',
          errorMessage: message,
        })
        .catch(() => null);
      throw new BadGatewayException({
        code: 'AI_PROVIDER_ERROR',
        message: 'เกิดข้อผิดพลาดขณะเรียก AI provider',
      });
    }
  }

  // ── List scans for a school ───────────────────────────────
  async listScans(user: AuthenticatedUser, take = 30) {
    const scans = await this.prisma.auditScan.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { ranBy: { select: { id: true, fullName: true } } },
    });
    return scans.map((s) => ({
      id: s.id,
      ranBy: s.ranBy,
      prCount: s.prCount,
      flagCount: s.flagCount,
      scope: s.scope as unknown,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async getScan(user: AuthenticatedUser, scanId: string) {
    const scan = await this.prisma.auditScan.findUnique({
      where: { id: scanId },
      include: {
        ranBy: { select: { id: true, fullName: true } },
        flags: {
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          include: {
            purchaseRequest: { select: { id: true, docNo: true, title: true } },
            item: { select: { id: true, name: true, ordinal: true } },
          },
        },
      },
    });
    if (!scan) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบ scan' });
    if (scan.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return {
      id: scan.id,
      ranBy: scan.ranBy,
      prCount: scan.prCount,
      flagCount: scan.flagCount,
      scope: scan.scope as unknown,
      notes: scan.notes,
      createdAt: scan.createdAt.toISOString(),
      flags: scan.flags.map((f) => ({
        id: f.id,
        type: f.type,
        severity: f.severity,
        message: f.message,
        detail: (f.detail ?? undefined) as unknown,
        modelVersion: f.modelVersion,
        createdAt: f.createdAt.toISOString(),
        dismissedAt: f.dismissedAt?.toISOString() ?? null,
        purchaseRequest: f.purchaseRequest,
        item: f.item,
      })),
    };
  }

  async listFlags(user: AuthenticatedUser, q: AuditFlagsQuery) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const where: Prisma.AiRiskFlagWhereInput = {
      purchaseRequest: { schoolId: user.schoolId, deletedAt: null },
    };
    if (q.severity) where.severity = q.severity;
    if (q.type) where.type = q.type;
    if (q.prId) where.purchaseRequestId = q.prId;
    if (q.scanId) where.auditScanId = q.scanId;
    if (q.open === true) where.dismissedAt = null;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.aiRiskFlag.count({ where }),
      this.prisma.aiRiskFlag.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          purchaseRequest: { select: { id: true, docNo: true, title: true, status: true } },
          item: { select: { id: true, name: true, ordinal: true } },
          auditScan: { select: { id: true, createdAt: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      flags: rows.map((r) => ({
        id: r.id,
        type: r.type,
        severity: r.severity,
        message: r.message,
        detail: (r.detail ?? undefined) as unknown,
        modelVersion: r.modelVersion,
        createdAt: r.createdAt.toISOString(),
        dismissedAt: r.dismissedAt?.toISOString() ?? null,
        purchaseRequest: r.purchaseRequest,
        item: r.item,
        scan: r.auditScan
          ? { id: r.auditScan.id, createdAt: r.auditScan.createdAt.toISOString() }
          : null,
      })),
    };
  }

  private mapAiType(t: 'BRAND_LOCK' | 'AMBIGUOUS_SPEC' | 'REASON_MISSING' | 'OTHER'): RiskType {
    return RiskType[t] ?? RiskType.OTHER;
  }

  private mapSeverity(s: 'LOW' | 'MEDIUM' | 'HIGH'): RiskSeverity {
    return RiskSeverity[s] ?? RiskSeverity.MEDIUM;
  }
}
