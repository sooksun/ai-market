import {
  BadGatewayException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import {
  CompareSummaryToolOutputSchema,
  type CompareSummaryResponse,
} from '@ai-market/shared';
import { ANTHROPIC, DEFAULT_MODEL } from '../anthropic.client';
import { BASE_SYSTEM_PROMPT_TH } from '../prompts/base-system';
import {
  COMPARE_SUMMARY_FEW_SHOT_TH,
  compareSummaryTool,
} from '../prompts/compare-summary.v1';
import { PROMPT_VERSIONS } from '../prompts/registry';
import { AiInvocationService } from '../ai-invocation.service';
import { ComparisonService } from '../../quotations/comparison.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class CompareSummaryService {
  constructor(
    @Inject(ANTHROPIC) private anthropic: Anthropic,
    private invocations: AiInvocationService,
    private comparison: ComparisonService,
  ) {}

  async summarize(
    user: AuthenticatedUser,
    purchaseRequestId: string,
  ): Promise<CompareSummaryResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY',
      });
    }

    const data = await this.comparison.build(user, purchaseRequestId);
    if (data.quotations.length === 0) {
      throw new NotFoundException({
        code: 'NO_QUOTATIONS',
        message: 'ยังไม่มีใบเสนอราคา — เพิ่มก่อนถึงจะให้ AI สรุปได้',
      });
    }

    const startedAt = Date.now();
    const promptVersion = PROMPT_VERSIONS.COMPARE_SUMMARY;
    const model = DEFAULT_MODEL;

    const userMessage = `ตารางเปรียบเทียบใบเสนอราคา (PR ${data.docNo ?? purchaseRequestId}):

\`\`\`json
${JSON.stringify(
  {
    items: data.items.map((it) => ({
      itemId: it.itemId,
      ordinal: it.ordinal,
      name: it.name,
      quantity: Number(it.quantity),
      unit: it.unit,
      unitPriceEst: it.unitPriceEst ? Number(it.unitPriceEst) : null,
    })),
    quotations: data.quotations.map((q) => ({
      quotationId: q.id,
      vendorName: q.vendor.name,
      vendorRating: q.vendor.rating,
      source: q.source,
      shippingFee: Number(q.shippingFee),
      itemsTotal: Number(q.itemsTotal),
      grandTotal: Number(q.grandTotal),
      fullySpecMatched: q.fullySpecMatched,
    })),
    matrix: data.items.flatMap((it) =>
      it.byQuotation.map((bq) => ({
        itemId: it.itemId,
        quotationId: bq.quotationId,
        unitPrice: Number(bq.unitPrice),
        lineTotal: Number(bq.lineTotal),
        specMatch: bq.specMatch,
      })),
    ),
  },
  null,
  2,
)}
\`\`\`

โปรดเรียก tool summarize_comparison`;

    try {
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: [
          { type: 'text', text: BASE_SYSTEM_PROMPT_TH, cache_control: { type: 'ephemeral' } },
          {
            type: 'text',
            text: COMPARE_SUMMARY_FEW_SHOT_TH,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [compareSummaryTool],
        tool_choice: { type: 'tool', name: 'summarize_comparison' },
        messages: [{ role: 'user', content: userMessage }],
      });

      const toolUse = response.content.find((c) => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new BadGatewayException({
          code: 'AI_PROVIDER_ERROR',
          message: 'AI ไม่ตอบ tool result',
        });
      }

      const parsed = CompareSummaryToolOutputSchema.safeParse(toolUse.input);
      if (!parsed.success) {
        await this.invocations.log({
          user,
          endpoint: 'ai.compare_summary',
          model,
          promptVersion,
          input: { purchaseRequestId },
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
        endpoint: 'ai.compare_summary',
        model,
        promptVersion,
        input: { purchaseRequestId },
        output: parsed.data,
        tokenInput: response.usage.input_tokens,
        tokenOutput: response.usage.output_tokens,
        latencyMs: Date.now() - startedAt,
        status: 'success',
      });

      return { invocationId: invocation.id, ...parsed.data };
    } catch (err) {
      if (
        err instanceof BadGatewayException ||
        err instanceof ForbiddenException ||
        err instanceof NotFoundException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      await this.invocations.log({
        user,
        endpoint: 'ai.compare_summary',
        model,
        promptVersion,
        input: { purchaseRequestId },
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
}
