import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Provider-neutral tool descriptor. Same shape as the Anthropic `Tool` we
 * used previously — kept as `input_schema` so existing prompt files port
 * over with a single import change.
 */
export interface LlmTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LlmCallOptions {
  /** System messages joined as separate `role: 'system'` blocks. */
  systemBlocks: string[];
  /** The user prompt. */
  userMessage: string;
  /** The tool the model is forced to call. */
  tool: LlmTool;
  /** Defaults to LlmService.defaultModel. */
  model?: string;
  /** Defaults to 2048. */
  maxTokens?: number;
}

export interface LlmResult {
  /** Parsed JSON object from the tool call (callers run zod safeParse on it). */
  toolInput: unknown;
  tokenInput: number;
  tokenOutput: number;
  /** The model id actually used (echoed for AiInvocation.model). */
  model: string;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Thin adapter over the OpenRouter OpenAI-compatible API. All AI features
 * route through `callTool()` which forces a function call on the supplied
 * tool and returns the parsed arguments — keeping the existing prompt +
 * zod-safeParse pattern untouched in the calling services.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private client: OpenAI;
  readonly defaultModel: string;
  readonly fastModel: string;

  constructor(config: ConfigService) {
    const apiKey =
      config.get<string>('OPENROUTER_API_KEY') ?? 'missing-openrouter-key';
    this.client = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        // OpenRouter uses these for app attribution / leaderboard listing.
        'HTTP-Referer':
          config.get<string>('OPENROUTER_REFERER') ?? 'http://localhost:3000',
        'X-Title': config.get<string>('OPENROUTER_APP_TITLE') ?? 'FinProcure AI',
      },
    });
    this.defaultModel =
      config.get<string>('OPENROUTER_MODEL') ?? 'google/gemini-2.5-flash';
    this.fastModel =
      config.get<string>('OPENROUTER_FAST_MODEL') ?? this.defaultModel;
  }

  isConfigured(): boolean {
    const key = process.env.OPENROUTER_API_KEY;
    return typeof key === 'string' && key.length > 0;
  }

  async callTool(opts: LlmCallOptions): Promise<LlmResult> {
    const model = opts.model ?? this.defaultModel;
    const systemMessages = opts.systemBlocks.map(
      (text) =>
        ({ role: 'system', content: text }) as const,
    );

    let response;
    try {
      response = await this.client.chat.completions.create({
        model,
        max_tokens: opts.maxTokens ?? 2048,
        messages: [
          ...systemMessages,
          { role: 'user', content: opts.userMessage },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: opts.tool.name,
              description: opts.tool.description,
              parameters: opts.tool.input_schema as Record<string, unknown>,
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: opts.tool.name },
        },
      });
    } catch (err) {
      // Bubble up as BadGateway with provider message preserved for logging.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`LLM call failed (${model}): ${message}`);
      throw new BadGatewayException({
        code: 'AI_PROVIDER_ERROR',
        message: 'เกิดข้อผิดพลาดขณะเรียก AI provider',
        details: { providerMessage: message },
      });
    }

    const choice = response.choices[0];
    if (!choice) {
      throw new BadGatewayException({
        code: 'AI_PROVIDER_ERROR',
        message: 'AI ไม่ตอบกลับ',
      });
    }
    const toolCall = choice.message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function') {
      throw new BadGatewayException({
        code: 'AI_PROVIDER_ERROR',
        message: 'AI ไม่ได้เรียก tool ที่ขอให้เรียก',
      });
    }

    let toolInput: unknown;
    try {
      // OpenAI returns tool arguments as a JSON-encoded string.
      toolInput = JSON.parse(toolCall.function.arguments);
    } catch (err) {
      throw new BadGatewayException({
        code: 'AI_PROVIDER_ERROR',
        message: 'AI ตอบกลับไม่ใช่ JSON ที่ถูกต้อง',
        details: {
          parseError: err instanceof Error ? err.message : String(err),
        },
      });
    }

    return {
      toolInput,
      tokenInput: response.usage?.prompt_tokens ?? 0,
      tokenOutput: response.usage?.completion_tokens ?? 0,
      model,
    };
  }
}
