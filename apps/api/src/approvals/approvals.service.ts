import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseRequestStatus, Role } from '@ai-market/db';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from '../budgets/budgets.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const FALLBACK_TEMPLATE = {
  steps: [
    { title: 'หัวหน้ากลุ่มสาระ/แผนก', approverRole: 'PROJECT_OWNER' as const },
    { title: 'เจ้าหน้าที่พัสดุ', approverRole: 'PROCUREMENT' as const },
    { title: 'หัวหน้างานการเงิน', approverRole: 'FINANCE' as const },
    { title: 'ผู้อำนวยการ', approverRole: 'DIRECTOR' as const },
  ],
};

interface WorkflowStepTemplate {
  title: string;
  approverRole: Role;
}

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private prisma: PrismaService,
    private budgets: BudgetsService,
  ) {}

  /**
   * Create or replace the workflow for a PR.
   * Called automatically when a quotation is selected (PR → PENDING_APPROVAL).
   * If a previous workflow exists (e.g. earlier rejected), it is cancelled
   * and a fresh one is created. Idempotent for IN_PROGRESS workflows.
   */
  async start(schoolId: string, prId: string, templateKey = 'default') {
    const existing = await this.prisma.approvalWorkflow.findUnique({
      where: { purchaseRequestId: prId },
      include: { steps: true },
    });
    if (existing && existing.status === 'IN_PROGRESS') {
      return existing;
    }

    const template = await this.loadTemplate(schoolId);

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        // Re-using one workflow row per PR (unique constraint). Reset to fresh state.
        await tx.approvalStep.deleteMany({ where: { workflowId: existing.id } });
        await tx.approvalWorkflow.update({
          where: { id: existing.id },
          data: {
            template: templateKey,
            currentStep: 1,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            completedAt: null,
          },
        });
        await tx.approvalStep.createMany({
          data: template.steps.map((s, i) => ({
            workflowId: existing.id,
            ordinal: i + 1,
            title: s.title,
            approverRole: s.approverRole,
          })),
        });
        return tx.approvalWorkflow.findUniqueOrThrow({
          where: { id: existing.id },
          include: { steps: { orderBy: { ordinal: 'asc' } } },
        });
      }

      const created = await tx.approvalWorkflow.create({
        data: {
          schoolId,
          purchaseRequestId: prId,
          template: templateKey,
          steps: {
            create: template.steps.map((s, i) => ({
              ordinal: i + 1,
              title: s.title,
              approverRole: s.approverRole,
            })),
          },
        },
        include: { steps: { orderBy: { ordinal: 'asc' } } },
      });
      return created;
    });
  }

  async getForPr(user: AuthenticatedUser, prId: string) {
    const wf = await this.prisma.approvalWorkflow.findUnique({
      where: { purchaseRequestId: prId },
      include: {
        steps: { orderBy: { ordinal: 'asc' } },
      },
    });
    if (!wf) return null;
    if (wf.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    return wf;
  }

  async approve(user: AuthenticatedUser, prId: string, comment: string | null) {
    const { wf, step } = await this.assertCurrentStep(user, prId);

    return this.prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: 'APPROVED',
          comment: comment ?? null,
          decidedById: user.id,
          decidedAt: new Date(),
        },
      });

      const isLastStep = step.ordinal >= wf.steps.length;
      if (isLastStep) {
        await tx.approvalWorkflow.update({
          where: { id: wf.id },
          data: { status: 'APPROVED', completedAt: new Date() },
        });
        await tx.purchaseRequest.update({
          where: { id: prId },
          data: { status: PurchaseRequestStatus.APPROVED, approvedAt: new Date() },
        });
      } else {
        await tx.approvalWorkflow.update({
          where: { id: wf.id },
          data: { currentStep: step.ordinal + 1 },
        });
      }
      return tx.approvalWorkflow.findUniqueOrThrow({
        where: { id: wf.id },
        include: { steps: { orderBy: { ordinal: 'asc' } } },
      });
    });
  }

  async reject(user: AuthenticatedUser, prId: string, comment: string) {
    const { wf, step } = await this.assertCurrentStep(user, prId);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: 'REJECTED',
          comment,
          decidedById: user.id,
          decidedAt: new Date(),
        },
      });
      await tx.approvalWorkflow.update({
        where: { id: wf.id },
        data: { status: 'REJECTED', completedAt: new Date() },
      });
      await tx.purchaseRequest.update({
        where: { id: prId },
        data: { status: PurchaseRequestStatus.REJECTED },
      });
      return tx.approvalWorkflow.findUniqueOrThrow({
        where: { id: wf.id },
        include: { steps: { orderBy: { ordinal: 'asc' } } },
      });
    });

    // Release any HOLD on the budget when PR is rejected.
    try {
      await this.budgets.releaseForPr(prId, user.id);
    } catch (err) {
      this.logger.warn(
        `budget release failed after reject for PR ${prId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return result;
  }

  async returnToRequester(user: AuthenticatedUser, prId: string, comment: string) {
    const { wf, step } = await this.assertCurrentStep(user, prId);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: 'RETURNED',
          comment,
          decidedById: user.id,
          decidedAt: new Date(),
        },
      });
      await tx.approvalWorkflow.update({
        where: { id: wf.id },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
      await tx.aiRiskFlag.create({
        data: {
          purchaseRequestId: prId,
          type: 'OTHER',
          severity: 'MEDIUM',
          message: `ส่งกลับจากขั้น "${step.title}": ${comment}`,
          modelVersion: 'human',
        },
      });
      await tx.purchaseRequest.update({
        where: { id: prId },
        data: { status: PurchaseRequestStatus.RETURNED },
      });
      return tx.approvalWorkflow.findUniqueOrThrow({
        where: { id: wf.id },
        include: { steps: { orderBy: { ordinal: 'asc' } } },
      });
    });

    try {
      await this.budgets.releaseForPr(prId, user.id);
    } catch (err) {
      this.logger.warn(
        `budget release failed after return for PR ${prId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return result;
  }

  /** Inbox for current user — PRs whose CURRENT step needs their role. */
  async inboxForUser(user: AuthenticatedUser) {
    const userRoles = user.roles as Role[];
    const workflows = await this.prisma.approvalWorkflow.findMany({
      where: {
        schoolId: user.schoolId,
        status: 'IN_PROGRESS',
      },
      include: {
        purchaseRequest: {
          select: {
            id: true,
            docNo: true,
            title: true,
            status: true,
            requester: { select: { id: true, fullName: true } },
            createdAt: true,
            submittedAt: true,
          },
        },
        steps: { orderBy: { ordinal: 'asc' } },
      },
      orderBy: { startedAt: 'desc' },
    });
    return workflows
      .map((wf) => {
        const current = wf.steps.find((s) => s.ordinal === wf.currentStep);
        if (!current) return null;
        const canAct =
          current.approverRole != null && userRoles.includes(current.approverRole);
        return {
          workflowId: wf.id,
          purchaseRequest: wf.purchaseRequest,
          currentStep: {
            id: current.id,
            ordinal: current.ordinal,
            title: current.title,
            approverRole: current.approverRole,
          },
          totalSteps: wf.steps.length,
          startedAt: wf.startedAt,
          canAct,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null && row.canAct);
  }

  // ───────── helpers ─────────

  private async assertCurrentStep(user: AuthenticatedUser, prId: string) {
    const wf = await this.prisma.approvalWorkflow.findUnique({
      where: { purchaseRequestId: prId },
      include: { steps: { orderBy: { ordinal: 'asc' } } },
    });
    if (!wf) {
      throw new NotFoundException({
        code: 'NO_WORKFLOW',
        message: 'ยังไม่มี approval workflow สำหรับคำขอนี้',
      });
    }
    if (wf.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }
    if (wf.status !== 'IN_PROGRESS') {
      throw new ConflictException({
        code: 'WORKFLOW_NOT_ACTIVE',
        message: `Workflow อยู่ในสถานะ ${wf.status} ไม่สามารถดำเนินการได้`,
      });
    }
    const step = wf.steps.find((s) => s.ordinal === wf.currentStep);
    if (!step) {
      throw new ConflictException({
        code: 'NO_CURRENT_STEP',
        message: 'ไม่พบ step ปัจจุบัน',
      });
    }
    if (step.approverRole && !(user.roles as Role[]).includes(step.approverRole)) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_TURN',
        message: `ขั้น "${step.title}" ต้องการ role ${step.approverRole} เท่านั้น`,
        details: { required: step.approverRole, actual: user.roles },
      });
    }
    return { wf, step };
  }

  private async loadTemplate(schoolId: string): Promise<{ steps: WorkflowStepTemplate[] }> {
    const rule = await this.prisma.ruleConfig.findFirst({
      where: {
        OR: [{ schoolId }, { schoolId: null }],
        key: 'approval_workflow_default',
      },
      orderBy: { schoolId: 'desc' }, // school-specific wins
    });
    if (!rule || !rule.value || typeof rule.value !== 'object') {
      return FALLBACK_TEMPLATE;
    }
    const obj = rule.value as { steps?: unknown };
    if (!Array.isArray(obj.steps) || obj.steps.length === 0) {
      return FALLBACK_TEMPLATE;
    }
    const steps: WorkflowStepTemplate[] = [];
    for (const raw of obj.steps) {
      if (
        raw &&
        typeof raw === 'object' &&
        'title' in raw &&
        'approverRole' in raw &&
        typeof (raw as { title: unknown }).title === 'string' &&
        typeof (raw as { approverRole: unknown }).approverRole === 'string'
      ) {
        steps.push({
          title: (raw as { title: string }).title,
          approverRole: (raw as { approverRole: Role }).approverRole,
        });
      }
    }
    return steps.length > 0 ? { steps } : FALLBACK_TEMPLATE;
  }
}
