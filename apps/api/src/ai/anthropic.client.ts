import Anthropic from '@anthropic-ai/sdk';

export const ANTHROPIC = 'ANTHROPIC_CLIENT';

export function createAnthropic(apiKey: string | undefined): Anthropic {
  return new Anthropic({
    apiKey: apiKey ?? 'missing-api-key',
  });
}

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7';
export const FAST_MODEL = 'claude-haiku-4-5-20251001';
