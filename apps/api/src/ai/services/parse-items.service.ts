import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import {
  ParseItemsToolOutputSchema,
  type ParseItemsInput,
  type ParseItemsResponse,
} from '@ai-market/shared';
import { ANTHROPIC, FAST_MODEL } from '../anthropic.client';
import { BASE_SYSTEM_PROMPT_TH } from '../prompts/base-system';
import { PARSE_ITEMS_FEW_SHOT_TH, parseItemsTool } from '../prompts/parse-items.v1';
import { PROMPT_VERSIONS } from '../prompts/registry';
import { AiInvocationService } from '../ai-invocation.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ParseItemsService {
  constructor(
    @Inject(ANTHROPIC) private anthropic: Anthropic,
    private invocations: AiInvocationService,
  ) {}

  async parse(user: AuthenticatedUser, input: ParseItemsInput): Promise<ParseItemsResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY',
      });
    }

    const startedAt = Date.now();
    const promptVersion = PROMPT_VERSIONS.PARSE_ITEMS;
    const model = FAST_MODEL;

    const userMessage = this.buildUserMessage(input);

    try {
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: [
          {
            type: 'text',
            text: BASE_SYSTEM_PROMPT_TH,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: PARSE_ITEMS_FEW_SHOT_TH,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [parseItemsTool],
        tool_choice: { type: 'tool', name: 'extract_items' },
        messages: [{ role: 'user', content: userMessage }],
      });

      const toolUse = response.content.find((c) => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new BadGatewayException({
          code: 'AI_PROVIDER_ERROR',
          message: 'AI ไม่ตอบกลับในรูปแบบที่ถูกต้อง',
        });
      }

      const parsed = ParseItemsToolOutputSchema.safeParse(toolUse.input);
      if (!parsed.success) {
        await this.invocations.log({
          user,
          endpoint: 'ai.parse_items',
          model,
          promptVersion,
          input,
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
        endpoint: 'ai.parse_items',
        model,
        promptVersion,
        input,
        output: parsed.data,
        tokenInput: response.usage.input_tokens,
        tokenOutput: response.usage.output_tokens,
        latencyMs: Date.now() - startedAt,
        status: 'success',
      });

      return { invocationId: invocation.id, ...parsed.data };
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      await this.invocations.log({
        user,
        endpoint: 'ai.parse_items',
        model,
        promptVersion,
        input,
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

  private buildUserMessage(input: ParseItemsInput): string {
    const hint = input.hint ? `\n\nข้อมูลเพิ่มเติม: ${input.hint}` : '';
    if (input.type === 'csv') {
      return `แยกรายการพัสดุจาก CSV ต่อไปนี้ (อาจมี header):\n\`\`\`csv\n${input.content}\n\`\`\`${hint}`;
    }
    return `แยกรายการพัสดุจากข้อความต่อไปนี้:\n"""\n${input.content}\n"""${hint}`;
  }
}
