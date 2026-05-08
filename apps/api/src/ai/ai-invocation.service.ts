import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

export interface LogInvocationInput {
  user: AuthenticatedUser | null;
  endpoint: string;
  model: string;
  promptVersion: string;
  input: unknown;
  output: unknown;
  tokenInput?: number;
  tokenOutput?: number;
  latencyMs: number;
  status: 'success' | 'error' | 'cancelled';
  errorMessage?: string;
}

const MAX_PAYLOAD_BYTES = 100_000;

function truncate(value: unknown): unknown {
  try {
    const json = JSON.stringify(value);
    if (json.length <= MAX_PAYLOAD_BYTES) return value;
    return { __truncated: true, preview: json.slice(0, 1000) };
  } catch {
    return { __unserializable: true };
  }
}

@Injectable()
export class AiInvocationService {
  constructor(private prisma: PrismaService) {}

  async log(input: LogInvocationInput) {
    return this.prisma.aiInvocation.create({
      data: {
        schoolId: input.user?.schoolId ?? null,
        userId: input.user?.id ?? null,
        endpoint: input.endpoint,
        model: input.model,
        promptVersion: input.promptVersion,
        input: truncate(input.input) as object,
        output: input.output === null ? undefined : (truncate(input.output) as object),
        tokenInput: input.tokenInput ?? null,
        tokenOutput: input.tokenOutput ?? null,
        latencyMs: input.latencyMs,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }
}
