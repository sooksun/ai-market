import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { IS_CSRF_EXEMPT_KEY } from '../decorators/csrf-exempt.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE = 'aim_csrf';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-submit cookie CSRF protection. The server sets a non-httpOnly
 * `aim_csrf` cookie on auth flows; the client must echo the same value via
 * the `X-CSRF-Token` header on every state-changing request.
 *
 * Endpoints that bootstrap or rotate the CSRF cookie itself (login, refresh,
 * logout) are exempt via `@CsrfExempt()`.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    const exempt = this.reflector.getAllAndOverride<boolean>(IS_CSRF_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) return true;

    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const cookieToken = cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];
    const headerStr = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    if (!cookieToken || !headerStr || !timingSafeEqual(cookieToken, headerStr)) {
      throw new ForbiddenException({
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token ไม่ถูกต้อง — กรุณารีเฟรชหน้าและลองอีกครั้ง',
      });
    }
    return true;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
