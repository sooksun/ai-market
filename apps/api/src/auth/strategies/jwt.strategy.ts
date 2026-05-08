import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth.service';

const ACCESS_COOKIE = 'aim_session';

function cookieExtractor(req: Request): string | null {
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
  return cookies?.[ACCESS_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-only-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true },
    });
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'session ไม่ถูกต้อง' });
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      schoolId: user.schoolId,
      roles: user.roles.map((r: { role: import('@ai-market/shared').Role }) => r.role),
    };
  }
}
