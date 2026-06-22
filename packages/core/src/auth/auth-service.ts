import { AppError, GENERIC_AUTH_ERROR_MESSAGE } from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AuditLogRepositoryPort } from '../ports/audit-log-repository';
import type { LoginAttemptRepositoryPort } from '../ports/login-attempt-repository';
import type { SessionRepositoryPort } from '../ports/session-repository';
import type { TurnstileVerifierPort } from '../ports/turnstile-verifier';
import type { UserRepositoryPort } from '../ports/user-repository';
import type { AuthConfig } from './config';
import { base64UrlEncode, randomBytes } from './crypto-utils';
import type { PasswordService } from './password-service';
import type { SessionService } from './session-service';
import type { LoginInput, LoginResult, RequestContext } from './types';

export interface AuthServiceDeps {
  users: UserRepositoryPort;
  sessions: SessionRepositoryPort;
  loginAttempts: LoginAttemptRepositoryPort;
  auditLogs: AuditLogRepositoryPort;
  passwords: PasswordService;
  sessionService: SessionService;
  clock: ClockPort;
  config: AuthConfig;
  // Disiapkan untuk fase berikutnya; tidak wajib pada Phase 3.
  turnstile?: TurnstileVerifierPort;
}

interface AuditContext {
  ip: string;
  userAgent?: string | null;
  requestId?: string | null;
}

export class AuthService {
  private readonly deps: AuthServiceDeps;

  constructor(deps: AuthServiceDeps) {
    this.deps = deps;
  }

  private newId(): string {
    return base64UrlEncode(randomBytes(16));
  }

  private async audit(
    action: string,
    actorId: string | null,
    actorRole: string | null,
    ctx: AuditContext,
    reason: string | null,
  ): Promise<void> {
    await this.deps.auditLogs.record({
      id: this.newId(),
      actorId,
      actorRole,
      action,
      entityType: 'session',
      entityId: null,
      reason,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
      createdAt: this.deps.clock.now().toISOString(),
    });
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const { users, sessions, loginAttempts, passwords, sessionService, clock, config } = this.deps;
    // Normalisasi User ID secara konsisten sebelum lockout, lookup, dan pencatatan.
    const userIdInput = input.userId.trim();
    const now = clock.now();
    const nowIso = now.toISOString();
    const since = new Date(now.getTime() - config.lockoutWindowSeconds * 1000).toISOString();

    const [failByUser, failByIp] = await Promise.all([
      loginAttempts.countRecentFailures({ since, userIdInput }),
      loginAttempts.countRecentFailures({ since, ipAddress: input.ip }),
    ]);
    if (failByUser >= config.maxFailedAttempts || failByIp >= config.maxFailedAttempts) {
      await this.audit('LOGIN_LOCKED', null, null, input, 'Terkunci sementara karena percobaan gagal berulang.');
      throw new AppError(
        'TOO_MANY_REQUESTS',
        'Terlalu banyak percobaan masuk. Silakan coba lagi nanti.',
        429,
      );
    }

    const user = await users.findByUserId(userIdInput);
    const passwordOk = user ? await passwords.verify(input.password, user.passwordHash) : false;
    if (!user) {
      // Samakan biaya komputasi untuk meredam timing attack dan user enumeration.
      await passwords.fakeVerify(input.password);
    }

    if (!user || !passwordOk) {
      await loginAttempts.record({
        id: this.newId(),
        userId: user?.id ?? null,
        userIdInput,
        success: false,
        ipAddress: input.ip,
        userAgent: input.userAgent ?? null,
        createdAt: nowIso,
      });
      await this.audit('LOGIN_FAILED', user?.id ?? null, null, input, 'Kredensial tidak valid.');
      throw new AppError('UNAUTHORIZED', GENERIC_AUTH_ERROR_MESSAGE, 401);
    }

    if (user.status !== 'ACTIVE') {
      await this.audit('LOGIN_BLOCKED', user.id, null, input, `Akun berstatus ${user.status}.`);
      throw new AppError('FORBIDDEN', 'Akun tidak aktif.', 403);
    }

    await loginAttempts.record({
      id: this.newId(),
      userId: user.id,
      userIdInput,
      success: true,
      ipAddress: input.ip,
      userAgent: input.userAgent ?? null,
      createdAt: nowIso,
    });
    // Reset counter kegagalan setelah login berhasil.
    await loginAttempts.clearFailures({ userIdInput, ipAddress: input.ip });

    const roles = await users.findRoleCodes(user.id);
    const isPrivileged = roles.includes('SUPERADMIN') || roles.includes('ADMIN');
    const ttl = isPrivileged ? config.adminSessionTtlSeconds : config.sessionTtlSeconds;
    const issued = await sessionService.issue(user.id, ttl);
    await sessions.create({
      id: issued.id,
      userId: user.id,
      tokenHash: issued.tokenHash,
      expiresAt: issued.expiresAt,
      createdAt: issued.createdAt,
    });

    const permissions = await users.findPermissionCodes(user.id);
    await this.audit('LOGIN_SUCCESS', user.id, roles[0] ?? null, input, null);

    return {
      token: issued.token,
      expiresAt: issued.expiresAt,
      principal: {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        roles,
        permissions,
      },
    };
  }

  async logout(token: string, ctx: RequestContext): Promise<void> {
    if (!token) {
      return;
    }
    const { sessions, sessionService, clock } = this.deps;
    const tokenHash = await sessionService.hashToken(token);
    const session = await sessions.findByTokenHash(tokenHash);
    if (!session) {
      return;
    }
    await sessions.revokeByTokenHash(tokenHash, clock.now().toISOString());
    await this.audit('SESSION_REVOKED', session.userId, null, ctx, 'Session dicabut oleh logout.');
  }
}
