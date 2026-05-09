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
  homeSchoolId: string;
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

  signTokens(
    user: { id: string; schoolId: string; roles: { role: Role }[] },
    activeSchoolId?: string,
  ): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      schoolId: activeSchoolId ?? user.schoolId,
      homeSchoolId: user.schoolId,
      roles: user.roles.map((r) => r.role),
    };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-only-refresh-change-me',
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    });
    return { accessToken, refreshToken };
  }

  /**
   * Decide if user can switch into the given school.
   * - SUPERADMIN: any active school
   * - tenantAccess includes target schoolId: yes
   * - target is the user's home school: yes
   */
  async assertCanAccessSchool(userId: string, schoolId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user || user.deletedAt || !user.active) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'session ไม่ถูกต้อง',
      });
    }
    const roles = user.roles.map((r) => r.role);
    if (roles.includes('SUPERADMIN')) {
      const exists = await this.prisma.school.findFirst({
        where: { id: schoolId, deletedAt: null, active: true },
        select: { id: true },
      });
      if (!exists) {
        throw new UnauthorizedException({
          code: 'TENANT_NOT_FOUND',
          message: 'ไม่พบโรงเรียนปลายทาง',
        });
      }
      return;
    }
    if (schoolId === user.schoolId) return;
    const access = parseTenantAccess(user.tenantAccess);
    if (access === '*' || access.includes(schoolId)) return;
    throw new UnauthorizedException({
      code: 'TENANT_FORBIDDEN',
      message: 'ไม่มีสิทธิ์เข้าโรงเรียนนี้',
    });
  }

  async listAccessibleSchools(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) return [];
    const roles = user.roles.map((r) => r.role);
    if (roles.includes('SUPERADMIN')) {
      return this.prisma.school.findMany({
        where: { deletedAt: null, active: true },
        orderBy: [{ area: { code: 'asc' } }, { name: 'asc' }],
        include: { area: { select: { id: true, code: true, name: true } } },
      });
    }
    const access = parseTenantAccess(user.tenantAccess);
    const ids = new Set<string>([user.schoolId]);
    if (Array.isArray(access)) for (const id of access) ids.add(id);
    return this.prisma.school.findMany({
      where: { id: { in: Array.from(ids) }, deletedAt: null, active: true },
      orderBy: [{ area: { code: 'asc' } }, { name: 'asc' }],
      include: { area: { select: { id: true, code: true, name: true } } },
    });
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

function parseTenantAccess(raw: unknown): '*' | string[] {
  if (raw === '*') return '*';
  if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === 'string');
  return [];
}
