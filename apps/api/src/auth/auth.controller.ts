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
import type { Request, Response } from 'express';
import { LoginInputSchema, type LoginInput } from '@ai-market/shared';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const ACCESS_COOKIE = 'aim_session';
const REFRESH_COOKIE = 'aim_refresh';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginInputSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateCredentials(body.email, body.password);
    const tokens = this.auth.signTokens(user);

    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        schoolId: user.schoolId,
        roles: user.roles.map((r: { role: string }) => r.role),
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const refreshToken = cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'no refresh token' });
    }
    const payload = this.auth.verifyRefresh(refreshToken);
    const user = await this.auth.getUserWithRoles(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'invalid session' });
    }
    const tokens = this.auth.signTokens(user);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  private setAuthCookies(res: Response, access: string, refresh: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
