import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';
import {
  LoginInputSchema,
  SwitchTenantInputSchema,
  type LoginInput,
  type SwitchTenantInput,
  type TenantsResponse,
} from '@ai-market/shared';
import { AuthService, type IssueContext } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CsrfExempt } from '../common/decorators/csrf-exempt.decorator';

const ACCESS_COOKIE = 'aim_session';
const REFRESH_COOKIE = 'aim_refresh';
const CSRF_COOKIE = 'aim_csrf';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @CsrfExempt()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request,
    @Body(new ZodValidationPipe(LoginInputSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateCredentials(body.email, body.password);
    const tokens = await this.auth.issueTokens(user, undefined, this.ctx(req));

    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    this.setCsrfCookie(res);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        schoolId: user.schoolId,
        homeSchoolId: user.schoolId,
        roles: user.roles.map((r: { role: string }) => r.role),
      },
    };
  }

  @Public()
  @CsrfExempt()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const refreshToken = cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'no refresh token' });
    }
    const tokens = await this.auth.rotateRefresh(refreshToken, this.ctx(req));
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    this.setCsrfCookie(res);
    return { ok: true };
  }

  @CsrfExempt()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const refreshToken = cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await this.auth.revokeRefresh(refreshToken);
    }
    res.clearCookie(ACCESS_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
    res.clearCookie(CSRF_COOKIE, { sameSite: 'lax', path: '/' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('tenants')
  async tenants(@CurrentUser() user: AuthenticatedUser): Promise<TenantsResponse> {
    const schools = await this.auth.listAccessibleSchools(user.id);
    const home = schools.find((s) => s.id === user.homeSchoolId);
    const current = schools.find((s) => s.id === user.schoolId);
    return {
      current: {
        schoolId: user.schoolId,
        schoolName: current?.name ?? user.schoolId,
        areaName: current?.area?.name ?? null,
      },
      home: {
        schoolId: user.homeSchoolId,
        schoolName: home?.name ?? user.homeSchoolId,
      },
      canSwitch: schools.length > 1 || user.roles.includes('SUPERADMIN'),
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        area: s.area
          ? { id: s.area.id, code: s.area.code, name: s.area.name }
          : null,
        isCurrent: s.id === user.schoolId,
        isHome: s.id === user.homeSchoolId,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  async switchTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SwitchTenantInputSchema)) body: SwitchTenantInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.assertCanAccessSchool(user.id, body.schoolId);
    const dbUser = await this.auth.getUserWithRoles(user.id);
    if (!dbUser) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'session หมดอายุ' });
    }
    // Best-effort revoke of the previous refresh so the old session can't be
    // resurrected from a leaked cookie.
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    if (cookies?.[REFRESH_COOKIE]) {
      await this.auth.revokeRefresh(cookies[REFRESH_COOKIE]);
    }
    const tokens = await this.auth.issueTokens(dbUser, body.schoolId, this.ctx(req));
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    this.setCsrfCookie(res);
    return { ok: true, schoolId: body.schoolId };
  }

  private ctx(req: Request): IssueContext {
    const xff = req.headers['x-forwarded-for'];
    const xffStr = Array.isArray(xff) ? xff[0] : xff;
    return {
      ip: (xffStr ?? req.ip ?? null) as string | null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  private setAuthCookies(res: Response, access: string, refresh: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: ACCESS_TTL_MS,
    });
    res.cookie(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: REFRESH_TTL_MS,
    });
  }

  /** Set the double-submit CSRF token (NOT httpOnly so JS can echo it). */
  private setCsrfCookie(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('base64url'), {
      httpOnly: false,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: REFRESH_TTL_MS,
    });
  }
}
