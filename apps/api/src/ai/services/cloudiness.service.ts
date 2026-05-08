import { BadGatewayException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import { Prisma, RiskSeverity, RiskType } from '@ai-market/db';
import {
  CloudinessToolOutputSchema,
  type CheckCloudinessResponse,
} from '@ai-market/shared';
import { ANTHROPIC, FAST_MODEL } from '../anthropic.client';
import { BASE_SYSTEM_PROMPT_TH } from '../prompts/base-system';
import {
  CLOUDINESS_CHECK_FEW_SHOT_TH,
  cloudinessCheckTool,
} from '../prompts/cloudiness-check.v1';
import { PROMPT_VERSIONS } from '../prompts/registry';
import { AiInvocationService } from '../ai-invocation.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class CloudinessService {
  private readonly logger = new Logger(CloudinessService.name);

  constructor(
    @Inject(ANTHROPIC) private anthropic: Anthropic,
    private invocations: AiInvocationService,
    private prisma: PrismaService,
  ) {}

  /**
   * Run cloudiness check on a PR.
   * - Replaces previous AI-generated risk flags (modelVersion = parse-items/cloudiness@v1)
   *   for this PR so re-runs don't pile up.
   * - Returns the structured output + count of flags written.
   */
  async check(
    user: AuthenticatedUser | null,
    purchaseRequestId: string,
  ): Promise<CheckCloudinessResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new BadGatewayException({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY',
      });
    }

    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      include: {
        items: { orderBy: { ordinal: 'asc' }, include: { specifications: true } },
      },
    });
    if (!pr || pr.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบคำขอซื้อ' });
    }

    const startedAt = Date.now();
    const promptVersion = PROMPT_VERSIONS.CLOUDINESS_CHECK;
    const model = FAST_MODEL;

    const payload = {
      title: pr.title,
      reason: pr.reason,
      items: pr.items.map((it) => ({
        ordinal: it.ordinal,
        name: it.name,
        quantity: Number(it.quantity),
        unit: it.unit,
        notes: it.notes ?? undefined,
        specifications: it.specifications.map((s) => ({ key: s.key, value: s.value })),
      })),
    };

    try {
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: [
          { type: 'text', text: BASE_SYSTEM_PROMPT_TH, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: CLOUDINESS_CHECK_FEW_SHOT_TH, cache_control: { type: 'ephemeral' } },
        ],
        tools: [cloudinessCheckTool],
        tool_choice: { type: 'tool', name: 'assess_cloudiness' },
        messages: [
          {
            role: 'user',
            content: `ตรวจคำขอซื้อต่อไปนี้:\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``,
          },
        ],
      });

      const toolUse = response.content.find((c) => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new BadGatewayException({
          code: 'AI_PROVIDER_ERROR',
          message: 'AI ไม่ตอบ tool result',
        });
      }

      const parsed = CloudinessToolOutputSchema.safeParse(toolUse.input);
      if (!parsed.success) {
        await this.invocations.log({
          user,
          endpoint: 'ai.check_cloudiness',
          model,
          promptVersion,
          input: { purchaseRequestId, payload },
          output: toolUse.input,
          tokenInput: response.usage.input_tokens,
          tokenOutput: response.usage.output_tokens,
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
        endpoint: 'ai.check_cloudiness',
        model,
        promptVersion,
        input: { purchaseRequestId, payload },
        output: parsed.data,
        tokenInput: response.usage.input_tokens,
        tokenOutput: response.usage.output_tokens,
        latencyMs: Date.now() - startedAt,
        status: 'success',
      });

      const itemByOrdinal = new Map(pr.items.map((it) => [it.ordinal, it.id]));

      // Replace previous AI cloudiness flags for this PR (idempotent re-runs).
      await this.prisma.aiRiskFlag.deleteMany({
        where: {
          purchaseRequestId: pr.id,
          modelVersion: { startsWith: 'cloudiness-check' },
          dismissedAt: null,
        },
      });

      const created = await this.prisma.aiRiskFlag.createMany({
        data: parsed.data.flags.map((f) => ({
          purchaseRequestId: pr.id,
          itemId: f.itemOrdinal != null ? itemByOrdinal.get(f.itemOrdinal) ?? null : null,
          type: this.mapType(f.type),
          severity: this.mapSeverity(f.severity),
          message: f.message,
          detail: (f.suggestion ? { suggestion: f.suggestion } : Prisma.JsonNull) as Prisma.InputJsonValue,
          modelVersion: promptVersion,
          invocationId: invocation.id,
        })),
      });

      return {
        invocationId: invocation.id,
        flags: parsed.data.flags,
        overallSeverity: parsed.data.overallSeverity,
        flagsCreated: created.count,
      };
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof NotFoundException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      await this.invocations
        .log({
          user,
          endpoint: 'ai.check_cloudiness',
          model,
          promptVersion,
          input: { purchaseRequestId },
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

  /** Fire-and-forget background trigger (used after PR submit). */
  triggerBackground(purchaseRequestId: string, user: AuthenticatedUser): void {
    void this.check(user, purchaseRequestId).catch((err) => {
      this.logger.warn(
        `cloudiness check failed for pr=${purchaseRequestId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  private mapType(t: string): RiskType {
    const map: Record<string, RiskType> = {
      AMBIGUOUS_SPEC: RiskType.AMBIGUOUS_SPEC,
      BRAND_LOCK: RiskType.BRAND_LOCK,
      REASON_MISSING: RiskType.REASON_MISSING,
      CLASSIFICATION_UNCERTAIN: RiskType.CLASSIFICATION_UNCERTAIN,
      OTHER: RiskType.OTHER,
    };
    return map[t] ?? RiskType.OTHER;
  }

  private mapSeverity(s: string): RiskSeverity {
    const map: Record<string, RiskSeverity> = {
      LOW: RiskSeverity.LOW,
      MEDIUM: RiskSeverity.MEDIUM,
      HIGH: RiskSeverity.HIGH,
    };
    return map[s] ?? RiskSeverity.MEDIUM;
  }
}
