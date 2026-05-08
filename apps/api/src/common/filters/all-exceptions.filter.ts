import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    traceId?: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'เกิดข้อผิดพลาดภายในระบบ';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (resp && typeof resp === 'object') {
        const r = resp as Record<string, unknown>;
        code = (r.code as string) ?? this.defaultCode(status);
        message = (r.message as string) ?? message;
        details = r.details ?? r;
      }
      if (code === 'INTERNAL_ERROR') code = this.defaultCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack);
    }

    const body: ErrorBody = {
      error: { code, message, details, traceId: req.headers['x-trace-id'] as string | undefined },
    };
    res.status(status).json(body);
  }

  private defaultCode(status: number): string {
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHENTICATED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 422) return 'UNPROCESSABLE';
    if (status === 429) return 'RATE_LIMITED';
    return 'INTERNAL_ERROR';
  }
}
