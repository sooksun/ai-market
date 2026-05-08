import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from '@ai-market/shared';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  schoolId: string;
  roles: Role[];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return user;
  }

  signTokens(user: { id: string; schoolId: string; roles: { role: Role }[] }): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      schoolId: user.schoolId,
      roles: user.roles.map((r) => r.role),
    };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-only-refresh-change-me',
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    });
    return { accessToken, refreshToken };
  }

  verifyRefresh(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-only-refresh-change-me',
      });
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่',
      });
    }
  }

  async getUserWithRoles(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
  }
}
