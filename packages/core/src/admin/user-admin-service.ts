import {
  AppError,
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
  type AdminUserDto,
  type Paginated,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { SessionAdminRepositoryPort } from '../ports/session-admin-repository';
import type { RoleRepositoryPort } from '../ports/role-repository';
import type { AdminUserRow, UserAdminRepositoryPort } from '../ports/user-admin-repository';
import type { AdminScopeRow } from '../auth/admin-scope-policy';
import { validatePasswordStrength } from '../auth/password-policy';
import type { PasswordService } from '../auth/password-service';
import {
  canManageRole,
  changedRoles,
  isAccessReduced,
  normalizeRoles,
} from './role-assignment';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { buildPage, offsetOf, type AdminContext, type ScopeFilter } from './types';

interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  role?: string;
  sortBy: 'userId' | 'fullName' | 'createdAt' | 'status';
  sortDir: 'asc' | 'desc';
}
interface CreateInput {
  userId: string;
  fullName: string;
  password: string;
  npk?: string;
  email?: string;
  phone?: string;
  position?: string;
  unit?: string;
  division?: string;
  organizationId?: string;
  roles?: string[];
}
interface UpdateInput {
  fullName?: string;
  npk?: string;
  email?: string;
  phone?: string;
  position?: string;
  unit?: string;
  division?: string;
  organizationId?: string;
}

export interface UserAdminDeps {
  users: UserAdminRepositoryPort;
  roles: RoleRepositoryPort;
  sessions: SessionAdminRepositoryPort;
  scopes: AdminScopeRepositoryPort;
  passwords: PasswordService;
  clock: ClockPort;
  audit: AdminAuditWriter;
}

export class UserAdminService {
  constructor(private readonly deps: UserAdminDeps) {}

  private now(): string {
    return this.deps.clock.now().toISOString();
  }

  private toDto(row: AdminUserRow, roles: string[]): AdminUserDto {
    return {
      id: row.id,
      userId: row.userId,
      npk: row.npk,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      position: row.position,
      unit: row.unit,
      division: row.division,
      organizationId: row.organizationId,
      status: row.status,
      mustChangePassword: row.mustChangePassword,
      lastLoginAt: row.lastLoginAt,
      roles,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async scopeRowsFor(ctx: AdminContext): Promise<AdminScopeRow[]> {
    const recs = await this.deps.scopes.findByAdminUserId(ctx.actor.id);
    return recs.map((r) => ({
      programId: r.programId,
      batchId: r.batchId,
      organizationId: r.organizationId,
    }));
  }

  private async scopeFilter(ctx: AdminContext): Promise<ScopeFilter> {
    if (ctx.actor.roles.includes('SUPERADMIN')) {
      return { kind: 'all' };
    }
    return { kind: 'scoped', rows: await this.scopeRowsFor(ctx) };
  }

  private async resolveRoleIds(codes: string[]): Promise<string[]> {
    const map = new Map((await this.deps.roles.list()).map((r) => [r.code, r.id]));
    return codes.map((code) => {
      const id = map.get(code);
      if (!id) {
        throw new AppError('VALIDATION_ERROR', `Role ${code} tidak dikenal.`, 400);
      }
      return id;
    });
  }

  async list(query: ListQuery, ctx: AdminContext): Promise<Paginated<AdminUserDto>> {
    const scope = await this.scopeFilter(ctx);
    const { items, total } = await this.deps.users.list({
      search: query.search,
      status: query.status,
      roleCode: query.role,
      limit: query.pageSize,
      offset: offsetOf(query.page, query.pageSize),
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      scope,
    });
    const rolesByUser = await this.deps.users.getRoleCodesForUsers(items.map((i) => i.id));
    return buildPage(
      items.map((u) => this.toDto(u, rolesByUser[u.id] ?? [])),
      total,
      query.page,
      query.pageSize,
    );
  }

  private async loadVisible(id: string, ctx: AdminContext): Promise<AdminUserRow> {
    const row = await this.deps.users.findById(id);
    if (!row) {
      throw new AppError('NOT_FOUND', 'User tidak ditemukan.', 404);
    }
    if (!ctx.actor.roles.includes('SUPERADMIN')) {
      const ok = await this.deps.users.isUserInScope(id, await this.scopeRowsFor(ctx));
      if (!ok) {
        throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses ke user ini.', 403);
      }
    }
    return row;
  }

  async get(id: string, ctx: AdminContext): Promise<AdminUserDto> {
    const row = await this.loadVisible(id, ctx);
    return this.toDto(row, await this.deps.users.getRoleCodes(id));
  }

  async create(input: CreateInput, ctx: AdminContext): Promise<AdminUserDto> {
    // Phase 4: ADMIN belum dapat membuktikan keterkaitan user baru dengan scope
    // administratifnya (participant assignment di luar lingkup), sehingga ditolak.
    if (!ctx.actor.roles.includes('SUPERADMIN')) {
      throw new AppError(
        'FORBIDDEN',
        'Keterkaitan user dengan scope administratif belum dapat dibuktikan pada fase ini.',
        403,
      );
    }
    const requestedRoles = normalizeRoles(input.roles ?? ['USER']);
    for (const role of requestedRoles) {
      if (!canManageRole(ctx.actor.roles, role)) {
        throw new AppError('FORBIDDEN', `Anda tidak dapat memberikan role ${role}.`, 403);
      }
    }
    if (await this.deps.users.existsByUserId(input.userId)) {
      throw new AppError('CONFLICT', 'User ID sudah digunakan.', 409);
    }
    const pwError = validatePasswordStrength(input.password);
    if (pwError) {
      throw new AppError('VALIDATION_ERROR', pwError, 400);
    }
    const passwordHash = await this.deps.passwords.hash(input.password);
    const roleIds = await this.resolveRoleIds(requestedRoles);
    const now = this.now();
    const id = generateId('user');
    const row: AdminUserRow = {
      id,
      userId: input.userId,
      npk: input.npk ?? null,
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      position: input.position ?? null,
      unit: input.unit ?? null,
      division: input.division ?? null,
      organizationId: input.organizationId ?? null,
      status: USER_STATUS_ACTIVE,
      mustChangePassword: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.deps.users.insert(
      { ...row, passwordHash, createdBy: ctx.actor.id },
      roleIds,
    );
    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.USER_CREATED,
      ctx,
      'user',
      id,
      `User ID ${input.userId}, role ${requestedRoles.join(', ')}.`,
    );
    return this.toDto(row, requestedRoles);
  }

  async update(id: string, input: UpdateInput, ctx: AdminContext): Promise<AdminUserDto> {
    const row = await this.loadVisible(id, ctx);
    const now = this.now();
    await this.deps.users.update(id, { ...input, updatedAt: now });
    await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.USER_UPDATED, ctx, 'user', id, null);
    const merged: AdminUserRow = {
      ...row,
      fullName: input.fullName ?? row.fullName,
      npk: input.npk ?? row.npk,
      email: input.email ?? row.email,
      phone: input.phone ?? row.phone,
      position: input.position ?? row.position,
      unit: input.unit ?? row.unit,
      division: input.division ?? row.division,
      organizationId: input.organizationId ?? row.organizationId,
      updatedAt: now,
    };
    return this.toDto(merged, await this.deps.users.getRoleCodes(id));
  }

  async setRoles(id: string, roles: string[], ctx: AdminContext): Promise<AdminUserDto> {
    const row = await this.deps.users.findById(id);
    if (!row) {
      throw new AppError('NOT_FOUND', 'User tidak ditemukan.', 404);
    }
    const current = await this.deps.users.getRoleCodes(id);
    const desired = normalizeRoles(roles);
    const changed = changedRoles(current, desired);
    for (const role of changed) {
      if (!canManageRole(ctx.actor.roles, role)) {
        throw new AppError('FORBIDDEN', `Anda tidak dapat mengubah role ${role}.`, 403);
      }
    }
    // Lindungi SUPERADMIN aktif terakhir.
    if (
      current.includes('SUPERADMIN') &&
      !desired.includes('SUPERADMIN') &&
      row.status === USER_STATUS_ACTIVE
    ) {
      if ((await this.deps.users.countActiveSuperadmins()) <= 1) {
        throw new AppError('CONFLICT', 'Tidak dapat mencabut SUPERADMIN aktif terakhir.', 409);
      }
    }
    const now = this.now();
    if (changed.length > 0) {
      const roleIds = await this.resolveRoleIds(desired);
      await this.deps.users.replaceRoles(id, roleIds);
      await this.deps.audit.record(
        ADMIN_AUDIT_ACTIONS.USER_ROLES_CHANGED,
        ctx,
        'user',
        id,
        `Role baru: ${desired.join(', ')}.`,
      );
      if (isAccessReduced(current, desired)) {
        await this.deps.sessions.revokeAllByUserId(id, now);
        await this.deps.audit.record(
          ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED,
          ctx,
          'user',
          id,
          'Perubahan role mengurangi hak akses.',
        );
      }
    }
    return this.toDto(row, desired);
  }

  async resetPassword(id: string, password: string, ctx: AdminContext): Promise<AdminUserDto> {
    const row = await this.loadVisible(id, ctx);
    const pwError = validatePasswordStrength(password);
    if (pwError) {
      throw new AppError('VALIDATION_ERROR', pwError, 400);
    }
    const now = this.now();
    const hash = await this.deps.passwords.hash(password);
    await this.deps.users.setPasswordHash(id, hash, now);
    await this.deps.sessions.revokeAllByUserId(id, now);
    await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.USER_PASSWORD_RESET, ctx, 'user', id, null);
    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED,
      ctx,
      'user',
      id,
      'Reset password mencabut seluruh session.',
    );
    return this.toDto(row, await this.deps.users.getRoleCodes(id));
  }

  async revokeSessions(id: string, ctx: AdminContext): Promise<AdminUserDto> {
    const row = await this.loadVisible(id, ctx);
    const count = await this.deps.sessions.revokeAllByUserId(id, this.now());
    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED,
      ctx,
      'user',
      id,
      `Mencabut ${count} session.`,
    );
    return this.toDto(row, await this.deps.users.getRoleCodes(id));
  }

  async activate(id: string, ctx: AdminContext): Promise<AdminUserDto> {
    const row = await this.loadVisible(id, ctx);
    const now = this.now();
    await this.deps.users.setStatus(id, USER_STATUS_ACTIVE, now);
    await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.USER_ACTIVATED, ctx, 'user', id, null);
    return this.toDto({ ...row, status: USER_STATUS_ACTIVE, updatedAt: now }, await this.deps.users.getRoleCodes(id));
  }

  async deactivate(id: string, ctx: AdminContext): Promise<AdminUserDto> {
    const row = await this.loadVisible(id, ctx);
    // SUPERADMIN tidak dapat menonaktifkan dirinya sendiri (dan tidak ada self-deactivation).
    if (id === ctx.actor.id) {
      throw new AppError('FORBIDDEN', 'Anda tidak dapat menonaktifkan akun Anda sendiri.', 403);
    }
    const roles = await this.deps.users.getRoleCodes(id);
    if (roles.includes('SUPERADMIN') && row.status === USER_STATUS_ACTIVE) {
      if ((await this.deps.users.countActiveSuperadmins()) <= 1) {
        throw new AppError('CONFLICT', 'Tidak dapat menonaktifkan SUPERADMIN aktif terakhir.', 409);
      }
    }
    const now = this.now();
    await this.deps.users.setStatus(id, USER_STATUS_INACTIVE, now);
    await this.deps.sessions.revokeAllByUserId(id, now);
    await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.USER_DEACTIVATED, ctx, 'user', id, null);
    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED,
      ctx,
      'user',
      id,
      'Deaktivasi mencabut seluruh session.',
    );
    return this.toDto({ ...row, status: USER_STATUS_INACTIVE, updatedAt: now }, roles);
  }
}
