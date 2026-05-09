import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseRequestStatus, RiskSeverity } from '@ai-market/db';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async director(user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      statusGroups,
      severityGroups,
      topRequestersRaw,
      aiInvocationsThisMonth,
      recentLogs,
      totalPrThisMonth,
      submittedThisMonth,
    ] = await Promise.all([
      this.prisma.purchaseRequest.groupBy({
        by: ['status'],
        where: { schoolId, deletedAt: null },
        _count: true,
      }),
      this.prisma.aiRiskFlag.groupBy({
        by: ['severity'],
        where: {
          purchaseRequest: { schoolId, deletedAt: null },
          dismissedAt: null,
        },
        _count: true,
      }),
      this.prisma.purchaseRequest.groupBy({
        by: ['requesterId'],
        where: { schoolId, createdAt: { gte: monthStart }, deletedAt: null },
        _count: true,
        orderBy: { _count: { requesterId: 'desc' } },
        take: 5,
      }),
      this.prisma.aiInvocation.aggregate({
        where: { schoolId, createdAt: { gte: monthStart }, status: 'success' },
        _count: true,
        _sum: { tokenInput: true, tokenOutput: true },
      }),
      this.prisma.auditLog.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.purchaseRequest.count({
        where: { schoolId, createdAt: { gte: monthStart }, deletedAt: null },
      }),
      this.prisma.purchaseRequest.count({
        where: {
          schoolId,
          submittedAt: { gte: monthStart },
          deletedAt: null,
        },
      }),
    ]);

    const requestsByStatus: Record<PurchaseRequestStatus, number> = {
      DRAFT: 0,
      SUBMITTED: 0,
      REVIEWING: 0,
      RETURNED: 0,
      APPROVED_FOR_COMPARISON: 0,
      IN_COMPARISON: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      REJECTED: 0,
      IN_RECEIVING: 0,
      RECEIVED: 0,
      CLOSED: 0,
      CANCELLED: 0,
    };
    statusGroups.forEach((g) => {
      requestsByStatus[g.status] = g._count;
    });

    const riskCount: Record<RiskSeverity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    severityGroups.forEach((g) => {
      riskCount[g.severity] = g._count;
    });

    // Resolve requester names
    const topIds = topRequestersRaw.map((r) => r.requesterId);
    const requesters = topIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: topIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const requesterMap = new Map(requesters.map((u) => [u.id, u]));
    const topRequesters = topRequestersRaw.map((r) => ({
      userId: r.requesterId,
      fullName: requesterMap.get(r.requesterId)?.fullName ?? '—',
      email: requesterMap.get(r.requesterId)?.email ?? '',
      count: r._count as number,
    }));

    return {
      generatedAt: now.toISOString(),
      monthStart: monthStart.toISOString(),
      summary: {
        totalPrThisMonth,
        submittedThisMonth,
        pendingReview: requestsByStatus.SUBMITTED + requestsByStatus.REVIEWING,
        totalRiskFlagsActive: riskCount.LOW + riskCount.MEDIUM + riskCount.HIGH,
      },
      requestsByStatus,
      riskCount,
      topRequesters,
      aiUsageThisMonth: {
        callCount: aiInvocationsThisMonth._count,
        tokenInput: aiInvocationsThisMonth._sum.tokenInput ?? 0,
        tokenOutput: aiInvocationsThisMonth._sum.tokenOutput ?? 0,
      },
      recentActivity: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        userId: l.userId,
        userName: l.user?.fullName ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  // ── Phase 5B — Financial dashboard ────────────────────────
  async financial(user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    const now = new Date();
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

    const [
      monthlyPrRaw,
      monthlySpendRaw,
      projectsWithBudgets,
      vendorsRecent,
      savingsCandidates,
    ] = await Promise.all([
      this.prisma.$queryRaw<Array<{ ym: string; cnt: bigint }>>(
        Prisma.sql`SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS cnt
                   FROM purchase_requests
                   WHERE school_id = ${schoolId}
                     AND deleted_at IS NULL
                     AND created_at >= ${trendStart}
                   GROUP BY ym
                   ORDER BY ym`,
      ),
      this.prisma.$queryRaw<Array<{ ym: string; total: string | null }>>(
        Prisma.sql`SELECT DATE_FORMAT(bm.created_at, '%Y-%m') AS ym,
                          SUM(bm.amount) AS total
                   FROM budget_movements bm
                   JOIN budgets b ON b.id = bm.budget_id
                   WHERE b.school_id = ${schoolId}
                     AND bm.type = 'SPEND'
                     AND bm.created_at >= ${trendStart}
                   GROUP BY ym
                   ORDER BY ym`,
      ),
      this.prisma.project.findMany({
        where: { schoolId, deletedAt: null, active: true },
        orderBy: { fiscalYear: 'desc' },
        include: {
          budgets: {
            include: {
              budgetSource: { select: { id: true, name: true, type: true } },
            },
          },
        },
      }),
      this.prisma.vendorQuotation.findMany({
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
          vendor: { select: { name: true, rating: true } },
          items: {
            select: {
              unitPrice: true,
              quantity: true,
              purchaseRequestItem: { select: { quantity: true } },
            },
          },
        },
      }),
      // Savings candidates: PRs with SELECTED quotation in last 90 days
      this.prisma.purchaseRequest.findMany({
        where: {
          schoolId,
          deletedAt: null,
          createdAt: { gte: ninetyDaysAgo },
          quotations: { some: { status: 'SELECTED' } },
        },
        include: {
          items: { select: { id: true, quantity: true } },
          quotations: {
            where: { status: { in: ['SUBMITTED', 'REVIEWING', 'SELECTED', 'REJECTED'] } },
            select: {
              id: true,
              status: true,
              shippingFee: true,
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
      }),
    ]);

    // 1) Monthly trend → backfill 12 buckets so chart has stable shape
    const monthBuckets: Array<{ ym: string; prCount: number; spend: string }> = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(trendStart.getFullYear(), trendStart.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets.push({ ym, prCount: 0, spend: '0' });
    }
    const byYm = new Map(monthBuckets.map((m, i) => [m.ym, i]));
    for (const r of monthlyPrRaw) {
      const i = byYm.get(r.ym);
      if (i != null) monthBuckets[i]!.prCount = Number(r.cnt);
    }
    for (const r of monthlySpendRaw) {
      const i = byYm.get(r.ym);
      if (i != null && r.total) monthBuckets[i]!.spend = r.total;
    }

    // 2) Project burn-down
    const allBudgetIds = projectsWithBudgets.flatMap((p) => p.budgets.map((b) => b.id));
    const movementSums = allBudgetIds.length
      ? await this.prisma.budgetMovement.groupBy({
          by: ['budgetId', 'type'],
          where: { budgetId: { in: allBudgetIds } },
          _sum: { amount: true },
        })
      : [];
    const sumByBudget = new Map<string, Map<string, Prisma.Decimal>>();
    for (const s of movementSums) {
      const m = sumByBudget.get(s.budgetId) ?? new Map();
      m.set(s.type, s._sum.amount ?? new Prisma.Decimal(0));
      sumByBudget.set(s.budgetId, m);
    }
    const projectRows = projectsWithBudgets.map((p) => {
      let allocated = new Prisma.Decimal(0);
      let held = new Prisma.Decimal(0);
      let committed = new Prisma.Decimal(0);
      let spent = new Prisma.Decimal(0);
      for (const b of p.budgets) {
        allocated = allocated.plus(b.allocated);
        const sums = sumByBudget.get(b.id);
        const get = (t: string) => sums?.get(t) ?? new Prisma.Decimal(0);
        const h = get('HOLD').minus(get('RELEASE'));
        const totalCommit = get('COMMIT');
        const sp = get('SPEND');
        const remCommit = totalCommit.minus(sp);
        held = held.plus(h.greaterThan(0) ? h : new Prisma.Decimal(0));
        committed = committed.plus(remCommit.greaterThan(0) ? remCommit : new Prisma.Decimal(0));
        spent = spent.plus(sp);
      }
      const available = allocated.minus(held).minus(committed).minus(spent);
      const used = held.plus(committed).plus(spent);
      const usedPct = allocated.greaterThan(0)
        ? Number(used.div(allocated).times(100).toFixed(1))
        : 0;
      return {
        projectId: p.id,
        code: p.code,
        name: p.name,
        fiscalYear: p.fiscalYear,
        allocated: allocated.toString(),
        held: held.toString(),
        committed: committed.toString(),
        spent: spent.toString(),
        available: available.toString(),
        usedPct,
        budgetCount: p.budgets.length,
      };
    });
    projectRows.sort((a, b) => Number(b.allocated) - Number(a.allocated));

    // 3) Top vendors (last 90 days)
    const vendorAgg = new Map<
      string,
      { vendorName: string; rating: number | null; total: number; prIds: Set<string> }
    >();
    for (const q of vendorsRecent) {
      let itemsTotal = new Prisma.Decimal(0);
      for (const qi of q.items) {
        const qty =
          qi.quantity ?? qi.purchaseRequestItem?.quantity ?? new Prisma.Decimal(0);
        itemsTotal = itemsTotal.plus(qi.unitPrice.times(qty));
      }
      const grand = Number(itemsTotal.plus(q.shippingFee));
      const cur = vendorAgg.get(q.vendorId) ?? {
        vendorName: q.vendor.name,
        rating: q.vendor.rating ? Number(q.vendor.rating) : null,
        total: 0,
        prIds: new Set<string>(),
      };
      cur.total += grand;
      cur.prIds.add(q.purchaseRequestId);
      vendorAgg.set(q.vendorId, cur);
    }
    const vendorTotalSpend = Array.from(vendorAgg.values()).reduce((s, v) => s + v.total, 0);
    const topVendors = Array.from(vendorAgg.entries())
      .map(([vendorId, v]) => ({
        vendorId,
        vendorName: v.vendorName,
        rating: v.rating,
        spend: v.total,
        prCount: v.prIds.size,
        sharePct: vendorTotalSpend > 0 ? Number(((v.total / vendorTotalSpend) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);

    // 4) AI savings (last 90 days, per PR: max grandTotal − selected grandTotal)
    let totalSavings = 0;
    let savingsPrCount = 0;
    let totalBaseline = 0;
    for (const pr of savingsCandidates) {
      const itemQty = new Map(pr.items.map((it) => [it.id, it.quantity]));
      const totals = pr.quotations.map((q) => {
        let itemsTotal = new Prisma.Decimal(0);
        for (const qi of q.items) {
          const qty =
            qi.quantity ?? itemQty.get(qi.purchaseRequestItemId) ?? new Prisma.Decimal(0);
          itemsTotal = itemsTotal.plus(qi.unitPrice.times(qty));
        }
        return {
          quotationId: q.id,
          status: q.status,
          grand: Number(itemsTotal.plus(q.shippingFee)),
        };
      });
      if (totals.length < 2) continue;
      const selected = totals.find((t) => t.status === 'SELECTED');
      if (!selected) continue;
      const max = Math.max(...totals.map((t) => t.grand));
      const saving = max - selected.grand;
      if (saving > 0) {
        totalSavings += saving;
        savingsPrCount += 1;
        totalBaseline += max;
      }
    }

    return {
      generatedAt: now.toISOString(),
      windowStart: trendStart.toISOString(),
      monthlyTrend: monthBuckets,
      projects: projectRows,
      topVendors,
      savings: {
        windowDays: 90,
        prCount: savingsPrCount,
        baselineTotal: totalBaseline.toString(),
        actualTotal: (totalBaseline - totalSavings).toString(),
        savedTotal: totalSavings.toString(),
        savedPct:
          totalBaseline > 0
            ? Number(((totalSavings / totalBaseline) * 100).toFixed(2))
            : 0,
      },
    };
  }

  // ── Phase 5B — Project drill-down ─────────────────────────
  async projectDrilldown(user: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        budgets: {
          include: { budgetSource: { select: { id: true, name: true, type: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบโครงการ' });
    if (project.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }

    const budgetIds = project.budgets.map((b) => b.id);
    const [movementSums, prs, monthlySpendRaw] = await Promise.all([
      budgetIds.length
        ? this.prisma.budgetMovement.groupBy({
            by: ['budgetId', 'type'],
            where: { budgetId: { in: budgetIds } },
            _sum: { amount: true },
          })
        : Promise.resolve([] as Array<{ budgetId: string; type: string; _sum: { amount: Prisma.Decimal | null } }>),
      this.prisma.purchaseRequest.findMany({
        where: { schoolId: user.schoolId, projectId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          requester: { select: { id: true, fullName: true } },
          budgetSource: { select: { id: true, name: true, type: true } },
          quotations: {
            where: { status: 'SELECTED' },
            take: 1,
            select: {
              shippingFee: true,
              vendor: { select: { id: true, name: true } },
              items: {
                select: {
                  unitPrice: true,
                  quantity: true,
                  purchaseRequestItem: { select: { quantity: true } },
                },
              },
            },
          },
        },
      }),
      budgetIds.length
        ? this.prisma.$queryRaw<Array<{ ym: string; total: string | null }>>(
            Prisma.sql`SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
                              SUM(amount) AS total
                       FROM budget_movements
                       WHERE budget_id IN (${Prisma.join(budgetIds)})
                         AND type = 'SPEND'
                       GROUP BY ym
                       ORDER BY ym`,
          )
        : Promise.resolve([] as Array<{ ym: string; total: string | null }>),
    ]);

    const sumByBudget = new Map<string, Map<string, Prisma.Decimal>>();
    for (const s of movementSums) {
      const m = sumByBudget.get(s.budgetId) ?? new Map();
      m.set(s.type, s._sum.amount ?? new Prisma.Decimal(0));
      sumByBudget.set(s.budgetId, m);
    }
    const budgetRows = project.budgets.map((b) => {
      const sums = sumByBudget.get(b.id);
      const get = (t: string) => sums?.get(t) ?? new Prisma.Decimal(0);
      const h = get('HOLD').minus(get('RELEASE'));
      const totalCommit = get('COMMIT');
      const sp = get('SPEND');
      const remCommit = totalCommit.minus(sp);
      const held = h.greaterThan(0) ? h : new Prisma.Decimal(0);
      const committed = remCommit.greaterThan(0) ? remCommit : new Prisma.Decimal(0);
      const available = b.allocated.minus(held).minus(committed).minus(sp);
      return {
        budgetId: b.id,
        budgetSource: b.budgetSource,
        allocated: b.allocated.toString(),
        held: held.toString(),
        committed: committed.toString(),
        spent: sp.toString(),
        available: available.toString(),
      };
    });

    let allocatedSum = new Prisma.Decimal(0);
    let heldSum = new Prisma.Decimal(0);
    let committedSum = new Prisma.Decimal(0);
    let spentSum = new Prisma.Decimal(0);
    for (const b of budgetRows) {
      allocatedSum = allocatedSum.plus(b.allocated);
      heldSum = heldSum.plus(b.held);
      committedSum = committedSum.plus(b.committed);
      spentSum = spentSum.plus(b.spent);
    }

    // PR rows with selected quotation info
    const prRows = prs.map((pr) => {
      let selectedTotal: number | null = null;
      let vendorName: string | null = null;
      const sel = pr.quotations[0];
      if (sel) {
        const itemQty = new Map<string, Prisma.Decimal>();
        let itemsTotal = new Prisma.Decimal(0);
        for (const qi of sel.items) {
          const qty =
            qi.quantity ?? qi.purchaseRequestItem?.quantity ?? new Prisma.Decimal(0);
          itemsTotal = itemsTotal.plus(qi.unitPrice.times(qty));
          itemQty.set('_', qty);
        }
        selectedTotal = Number(itemsTotal.plus(sel.shippingFee));
        vendorName = sel.vendor.name;
      }
      return {
        id: pr.id,
        docNo: pr.docNo,
        title: pr.title,
        status: pr.status,
        requester: pr.requester,
        budgetSource: pr.budgetSource,
        selectedTotal: selectedTotal !== null ? selectedTotal.toString() : null,
        vendorName,
        createdAt: pr.createdAt.toISOString(),
        approvedAt: pr.approvedAt?.toISOString() ?? null,
      };
    });

    // Vendor mix from this project's PRs
    const vendorMix = new Map<string, { vendorName: string; total: number; prCount: number }>();
    for (const pr of prRows) {
      if (!pr.vendorName || pr.selectedTotal === null) continue;
      const cur = vendorMix.get(pr.vendorName) ?? {
        vendorName: pr.vendorName,
        total: 0,
        prCount: 0,
      };
      cur.total += Number(pr.selectedTotal);
      cur.prCount += 1;
      vendorMix.set(pr.vendorName, cur);
    }

    return {
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        fiscalYear: project.fiscalYear,
      },
      summary: {
        allocated: allocatedSum.toString(),
        held: heldSum.toString(),
        committed: committedSum.toString(),
        spent: spentSum.toString(),
        available: allocatedSum.minus(heldSum).minus(committedSum).minus(spentSum).toString(),
        prCount: prRows.length,
      },
      budgets: budgetRows,
      monthlySpend: monthlySpendRaw.map((r) => ({ ym: r.ym, spend: r.total ?? '0' })),
      prs: prRows,
      vendorMix: Array.from(vendorMix.values()).sort((a, b) => b.total - a.total),
    };
  }
}
