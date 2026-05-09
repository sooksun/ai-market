import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
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

export interface RefreshJwtPayload extends JwtPayload {
  jti: string;
}

export interface IssueContext {
  ip?: string | null;
  userAgent?: string | null;
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

  /**
   * Issue a fresh access+refresh pair AND persist the refresh token row.
   * Use this on login / switch-tenant / first issuance.
   */
  async issueTokens(
    user: { id: string; schoolId: string; roles: { role: Role }[] },
    activeSchoolId: string | undefined,
    ctx: IssueContext = {},
  ): Promise<AuthTokens> {
    const jti = crypto.randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      schoolId: activeSchoolId ?? user.schoolId,
      homeSchoolId: user.schoolId,
      roles: user.roles.map((r) => r.role),
    };
    const accessToken = this.jwt.sign(payload);
    const refreshPayload: RefreshJwtPayload = { ...payload, jti };
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-only-refresh-change-me',
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        jti,
        tokenHash: hashToken(refreshToken),
        schoolId: payload.schoolId,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent?.slice(0, 510) ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Rotate a refresh token: validate the presented token, revoke it, and
   * issue a new pair. If the presented token was already revoked, treat it
   * as theft and revoke ALL outstanding tokens for the user.
   */
  async rotateRefresh(
    presentedToken: string,
    ctx: IssueContext = {},
  ): Promise<AuthTokens> {
    const payload = this.verifyRefresh(presentedToken);
    if (!payload.jti) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'refresh token รุ่นเก่า กรุณาเข้าสู่ระบบใหม่',
      });
    }
    const presentedHash = hashToken(presentedToken);

    const row = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
    });

    // Token theft heuristic: if we can't find the row OR it has been revoked,
    // someone is replaying an old refresh. Revoke every outstanding token for
    // this user and force re-login.
    if (!row || row.revokedAt) {
      this.logger.warn(
        `refresh reuse detected for user=${payload.sub} jti=${payload.jti} — revoking all`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: 'REFRESH_REUSE',
        message: 'session ผิดปกติ กรุณาเข้าสู่ระบบใหม่',
      });
    }
    if (row.tokenHash !== presentedHash || row.userId !== payload.sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'refresh token ไม่ถูกต้อง',
      });
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่',
      });
    }

    const user = await this.getUserWithRoles(payload.sub);
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'บัญชีผู้ใช้ถูกระงับ',
      });
    }

    // Issue the replacement first, then mark the old row revoked + replacedBy.
    const tokens = await this.issueTokens(user, row.schoolId, ctx);
    const newRow = await this.prisma.refreshToken.findFirst({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), replacedById: newRow?.id ?? null },
    });

    return tokens;
  }

  /** Revoke a specific refresh token (logout). */
  async revokeRefresh(presentedToken: string): Promise<void> {
    let payload: RefreshJwtPayload;
    try {
      payload = this.verifyRefresh(presentedToken);
    } catch {
      return; // already invalid — nothing to revoke
    }
    if (!payload.jti) return;
    await this.prisma.refreshToken.updateMany({
      where: { jti: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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

  verifyRefresh(token: string): RefreshJwtPayload {
    try {
      return this.jwt.verify<RefreshJwtPayload>(token, {
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
