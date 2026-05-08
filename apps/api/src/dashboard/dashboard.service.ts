import { Injectable } from '@nestjs/common';
import { PurchaseRequestStatus, RiskSeverity } from '@ai-market/db';
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
}
