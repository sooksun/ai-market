import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  SpecWriterToolOutputSchema,
  type SpecTone,
  type SpecWriterResponse,
} from '@ai-market/shared';
import { LlmService } from '../llm.service';
import { BASE_SYSTEM_PROMPT_TH } from '../prompts/base-system';
import { SPEC_WRITER_FEW_SHOT_TH, specWriterTool } from '../prompts/spec-writer.v1';
import { PROMPT_VERSIONS } from '../prompts/registry';
import { AiInvocationService } from '../ai-invocation.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class SpecWriterService {
  constructor(
    private llm: LlmService,
    private prisma: PrismaService,
    private invocations: AiInvocationService,
  ) {}

  async rewrite(
    user: AuthenticatedUser,
    itemId: string,
    tone: SpecTone,
    rawSpecOverride?: string,
  ): Promise<SpecWriterResponse> {
    if (!this.llm.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY',
      });
    }

    const item = await this.prisma.purchaseRequestItem.findUnique({
      where: { id: itemId },
      include: {
        purchaseRequest: { select: { id: true, schoolId: true, requesterId: true } },
        specifications: { orderBy: { ordinal: 'asc' } },
      },
    });
    if (!item) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'ไม่พบรายการพัสดุ' });
    }
    if (item.purchaseRequest.schoolId !== user.schoolId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'ข้ามโรงเรียนไม่ได้' });
    }

    const lockWords = await this.loadLockWords(user.schoolId);

    const rawSpec =
      rawSpecOverride ??
      item.specifications.map((s) => `${s.key}: ${s.value}`).join('\n') ??
      item.notes ??
      '';

    const userMessage = `ช่วยเขียนสเปกใหม่ให้รายการนี้

ชื่อรายการ: ${item.name}
หน่วย: ${item.unit}
จำนวน: ${item.quantity.toString()}
สเปก/หมายเหตุปัจจุบัน:
"""
${rawSpec || '(ไม่มี)'}
"""

tone: ${tone}
คำเสี่ยงล็อกยี่ห้อ (lockWords) ที่ admin ระบุไว้: ${JSON.stringify(lockWords)}

ผลลัพธ์ต้องเป็น tool call rewrite_specification เท่านั้น`;

    const startedAt = Date.now();
    const promptVersion = PROMPT_VERSIONS.SPEC_WRITER;
    const model = this.llm.defaultModel;

    try {
      const result = await this.llm.callTool({
        model,
        maxTokens: 2048,
        systemBlocks: [BASE_SYSTEM_PROMPT_TH, SPEC_WRITER_FEW_SHOT_TH],
        userMessage,
        tool: specWriterTool,
      });

      const parsed = SpecWriterToolOutputSchema.safeParse(result.toolInput);
      if (!parsed.success) {
        await this.invocations.log({
          user,
          endpoint: 'ai.spec_writer',
          model: result.model,
          promptVersion,
          input: { itemId, tone, rawSpec },
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
        endpoint: 'ai.spec_writer',
        model: result.model,
        promptVersion,
        input: { itemId, tone, rawSpec, lockWords },
        output: parsed.data,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        latencyMs: Date.now() - startedAt,
        status: 'success',
      });

      return {
        invocationId: invocation.id,
        itemId: item.id,
        itemName: item.name,
        tone,
        ...parsed.data,
      };
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      await this.invocations.log({
        user,
        endpoint: 'ai.spec_writer',
        model,
        promptVersion,
        input: { itemId, tone, rawSpec },
        output: null,
        latencyMs: Date.now() - startedAt,
        status: 'error',
        errorMessage: message,
      });
      throw new BadGatewayException({
        code: 'AI_PROVIDER_ERROR',
        message: 'เกิดข้อผิดพลาดขณะเรียก AI provider',
      });
    }
  }

  private async loadLockWords(schoolId: string): Promise<string[]> {
    const rule = await this.prisma.ruleConfig.findFirst({
      where: {
        OR: [{ schoolId }, { schoolId: null }],
        key: 'spec_lock_words',
      },
      orderBy: { schoolId: 'desc' }, // school-specific wins over global
    });
    if (!rule || !rule.value || typeof rule.value !== 'object') return [];
    const obj = rule.value as { words?: unknown };
    if (!Array.isArray(obj.words)) return [];
    return obj.words.filter((w): w is string => typeof w === 'string');
  }
}
