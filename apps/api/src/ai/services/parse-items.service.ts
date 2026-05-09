import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ParseItemsToolOutputSchema,
  type ParseItemsInput,
  type ParseItemsResponse,
} from '@ai-market/shared';
import { LlmService } from '../llm.service';
import { BASE_SYSTEM_PROMPT_TH } from '../prompts/base-system';
import { PARSE_ITEMS_FEW_SHOT_TH, parseItemsTool } from '../prompts/parse-items.v1';
import { PROMPT_VERSIONS } from '../prompts/registry';
import { AiInvocationService } from '../ai-invocation.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ParseItemsService {
  constructor(
    private llm: LlmService,
    private invocations: AiInvocationService,
  ) {}

  async parse(user: AuthenticatedUser, input: ParseItemsInput): Promise<ParseItemsResponse> {
    if (!this.llm.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY',
      });
    }

    const startedAt = Date.now();
    const promptVersion = PROMPT_VERSIONS.PARSE_ITEMS;
    const model = this.llm.fastModel;

    const userMessage = this.buildUserMessage(input);

    try {
      const result = await this.llm.callTool({
        model,
        maxTokens: 2048,
        systemBlocks: [BASE_SYSTEM_PROMPT_TH, PARSE_ITEMS_FEW_SHOT_TH],
        userMessage,
        tool: parseItemsTool,
      });

      const parsed = ParseItemsToolOutputSchema.safeParse(result.toolInput);
      if (!parsed.success) {
        await this.invocations.log({
          user,
          endpoint: 'ai.parse_items',
          model: result.model,
          promptVersion,
          input,
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
        endpoint: 'ai.parse_items',
        model: result.model,
        promptVersion,
        input,
        output: parsed.data,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        latencyMs: Date.now() - startedAt,
        status: 'success',
      });

      return { invocationId: invocation.id, ...parsed.data };
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) {
        // Already logged where appropriate; just bubble.
        if (err instanceof BadGatewayException && !(err.getResponse() as { logged?: boolean })?.logged) {
          const message = (err.getResponse() as { details?: { providerMessage?: string } })?.details?.providerMessage ?? err.message;
          await this.invocations
            .log({
              user,
              endpoint: 'ai.parse_items',
              model,
              promptVersion,
              input,
              output: null,
              latencyMs: Date.now() - startedAt,
              status: 'error',
              errorMessage: message,
            })
            .catch(() => null);
        }
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
    const source = input.sourceFilename
      ? `\n\nที่มา: ไฟล์ "${input.sourceFilename}"`
      : '';
    if (input.type === 'csv') {
      return `แยกรายการพัสดุจาก CSV ต่อไปนี้ (อาจมี header):\n\`\`\`csv\n${input.content}\n\`\`\`${source}${hint}`;
    }
    if (input.type === 'excel') {
      return `แยกรายการพัสดุจากตาราง Excel ต่อไปนี้ (TSV — แท็บคั่นคอลัมน์, แถวแรกอาจเป็น header):\n\`\`\`tsv\n${input.content}\n\`\`\`${source}${hint}`;
    }
    return `แยกรายการพัสดุจากข้อความต่อไปนี้:\n"""\n${input.content}\n"""${hint}`;
  }
}
