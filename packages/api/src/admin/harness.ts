// Test harness in-memory untuk integration test API (auth + admin Phase 4).
// Bukan file test. Menyusun ApiDeps lengkap dari fake repository.
import {
  AdminAuditWriter,
  AdminScopeService,
  AuthService,
  AuthenticationService,
  BatchService,
  HealthService,
  OrganizationService,
  PasswordService,
  ProgramService,
  SessionService,
  UserAdminService,
  type AdminScopeRecord,
  type AdminScopeRepositoryPort,
  type AdminScopeRow,
  type AdminUserRow,
  type AuditLogRepositoryPort,
  type BatchRow,
  type ClearFailuresQuery,
  type ClockPort,
  type FailureQuery,
  type LoginAttemptRepositoryPort,
  type NewAdminScope,
  type NewAuditLog,
  type NewBatch,
  type NewLoginAttempt,
  type NewOrganization,
  type NewProgram,
  type NewSession,
  type NewUserRow,
  type OrganizationListFilter,
  type OrganizationPatch,
  type OrganizationRepositoryPort,
  type OrganizationRow,
  type ProgramListFilter,
  type ProgramPatch,
  type ProgramRepositoryPort,
  type ProgramRow,
  type BatchListFilter,
  type BatchPatch,
  type BatchRepositoryPort,
  type RoleRepositoryPort,
  type RoleRow,
  type SessionAdminRepositoryPort,
  type SessionRecord,
  type SessionRepositoryPort,
  type UserAdminRepositoryPort,
  type UserListFilter,
  type UserPatch,
  type UserRecord,
  type UserRepositoryPort,
  isWithinScope,
} from '@sarel/core';
import { PERMISSION_CODES } from '@sarel/shared';
import { createApp } from '../app';
import type { ApiDeps } from '../middleware/types';

const ROLES: RoleRow[] = [
  { id: 'role_superadmin', code: 'SUPERADMIN' },
  { id: 'role_admin', code: 'ADMIN' },
  { id: 'role_user', code: 'USER' },
];
const ID_TO_CODE = new Map(ROLES.map((r) => [r.id, r.code]));
const CODE_TO_ID = new Map(ROLES.map((r) => [r.code, r.id]));

const ADMIN_PERMS = [
  // dari seed 0003
  'user.read',
  'program.read',
  'batch.read',
  'assessment.read',
  'evaluator.read',
  'quiz.read',
  'monitoring.read',
  'report.read',
  'report.export',
  'audit.read',
  // dari seed 0004 (Phase 4)
  'user.create',
  'user.update',
  'organization.read',
  'organization.manage',
  'program.manage',
  'batch.manage',
];
const SUPER_PERMS = [...PERMISSION_CODES, 'organization.read', 'organization.manage'];

function permsFor(roleCodes: string[]): string[] {
  const set = new Set<string>();
  if (roleCodes.includes('SUPERADMIN')) SUPER_PERMS.forEach((p) => set.add(p));
  if (roleCodes.includes('ADMIN')) ADMIN_PERMS.forEach((p) => set.add(p));
  return [...set];
}

interface StoredUser extends AdminUserRow {
  passwordHash: string;
  roleCodes: string[];
}

class MutableClock implements ClockPort {
  current = new Date('2026-06-22T00:00:00Z');
  now(): Date {
    return this.current;
  }
}

class UserStore {
  users = new Map<string, StoredUser>();
}

class AuthUsers implements UserRepositoryPort {
  constructor(private readonly store: UserStore) {}
  private rec(u: StoredUser): UserRecord {
    return { id: u.id, userId: u.userId, fullName: u.fullName, passwordHash: u.passwordHash, status: u.status };
  }
  async findByUserId(userId: string): Promise<UserRecord | null> {
    const u = [...this.store.users.values()].find((x) => x.userId === userId);
    return u ? this.rec(u) : null;
  }
  async findById(id: string): Promise<UserRecord | null> {
    const u = this.store.users.get(id);
    return u ? this.rec(u) : null;
  }
  async findRoleCodes(id: string): Promise<string[]> {
    return this.store.users.get(id)?.roleCodes ?? [];
  }
  async findPermissionCodes(id: string): Promise<string[]> {
    return permsFor(this.store.users.get(id)?.roleCodes ?? []);
  }
}

class AdminUsers implements UserAdminRepositoryPort {
  constructor(private readonly store: UserStore) {}
  private strip(u: StoredUser): AdminUserRow {
    const { passwordHash: _p, roleCodes: _r, ...row } = u;
    void _p;
    void _r;
    return row;
  }
  async list(filter: UserListFilter): Promise<{ items: AdminUserRow[]; total: number }> {
    let arr = [...this.store.users.values()];
    if (filter.scope.kind === 'scoped') arr = [];
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter((u) => u.userId.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q));
    }
    if (filter.status) arr = arr.filter((u) => u.status === filter.status);
    if (filter.roleCode) arr = arr.filter((u) => u.roleCodes.includes(filter.roleCode!));
    arr.sort((a, b) => {
      const dir = filter.sortDir === 'asc' ? 1 : -1;
      const av = String(a[filter.sortBy] ?? '');
      const bv = String(b[filter.sortBy] ?? '');
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    const total = arr.length;
    return { items: arr.slice(filter.offset, filter.offset + filter.limit).map((u) => this.strip(u)), total };
  }
  async findById(id: string): Promise<AdminUserRow | null> {
    const u = this.store.users.get(id);
    return u ? this.strip(u) : null;
  }
  async existsByUserId(userId: string): Promise<boolean> {
    return [...this.store.users.values()].some((u) => u.userId === userId);
  }
  async insert(row: NewUserRow, roleIds: string[]): Promise<void> {
    this.store.users.set(row.id, {
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
      lastLoginAt: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      passwordHash: row.passwordHash,
      roleCodes: roleIds.map((id) => ID_TO_CODE.get(id) ?? id),
    });
  }
  async update(id: string, patch: UserPatch): Promise<void> {
    const u = this.store.users.get(id);
    if (!u) return;
    Object.assign(u, {
      fullName: patch.fullName ?? u.fullName,
      npk: patch.npk ?? u.npk,
      email: patch.email ?? u.email,
      phone: patch.phone ?? u.phone,
      position: patch.position ?? u.position,
      unit: patch.unit ?? u.unit,
      division: patch.division ?? u.division,
      organizationId: patch.organizationId ?? u.organizationId,
      updatedAt: patch.updatedAt,
    });
  }
  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    const u = this.store.users.get(id);
    if (u) {
      u.status = status;
      u.updatedAt = updatedAt;
    }
  }
  async setPasswordHash(id: string, passwordHash: string, updatedAt: string): Promise<void> {
    const u = this.store.users.get(id);
    if (u) {
      u.passwordHash = passwordHash;
      u.updatedAt = updatedAt;
    }
  }
  async getRoleCodes(id: string): Promise<string[]> {
    return this.store.users.get(id)?.roleCodes ?? [];
  }
  async getRoleCodesForUsers(ids: string[]): Promise<Record<string, string[]>> {
    const out: Record<string, string[]> = {};
    for (const id of ids) {
      const u = this.store.users.get(id);
      if (u) out[id] = u.roleCodes;
    }
    return out;
  }
  async replaceRoles(id: string, roleIds: string[]): Promise<void> {
    const u = this.store.users.get(id);
    if (u) u.roleCodes = roleIds.map((rid) => ID_TO_CODE.get(rid) ?? rid);
  }
  async countActiveSuperadmins(): Promise<number> {
    return [...this.store.users.values()].filter(
      (u) => u.status === 'ACTIVE' && u.roleCodes.includes('SUPERADMIN'),
    ).length;
  }
  async isUserInScope(_id: string, _scopes: AdminScopeRow[]): Promise<boolean> {
    void _id;
    void _scopes;
    return false;
  }
}

class Sessions implements SessionRepositoryPort, SessionAdminRepositoryPort {
  byHash = new Map<string, SessionRecord>();
  async create(s: NewSession): Promise<void> {
    this.byHash.set(s.tokenHash, { ...s, revokedAt: null });
  }
  async findByTokenHash(h: string): Promise<SessionRecord | null> {
    return this.byHash.get(h) ?? null;
  }
  async revokeByTokenHash(h: string, revokedAt: string): Promise<void> {
    const s = this.byHash.get(h);
    if (s) s.revokedAt = revokedAt;
  }
  async revokeAllByUserId(userId: string, revokedAt: string): Promise<number> {
    let n = 0;
    for (const s of this.byHash.values()) {
      if (s.userId === userId && !s.revokedAt) {
        s.revokedAt = revokedAt;
        n += 1;
      }
    }
    return n;
  }
}

class LoginAttempts implements LoginAttemptRepositoryPort {
  rows: NewLoginAttempt[] = [];
  async record(a: NewLoginAttempt): Promise<void> {
    this.rows.push(a);
  }
  async countRecentFailures(q: FailureQuery): Promise<number> {
    return this.rows.filter(
      (r) =>
        !r.success &&
        r.createdAt >= q.since &&
        (q.userIdInput === undefined || r.userIdInput === q.userIdInput) &&
        (q.ipAddress === undefined || r.ipAddress === q.ipAddress),
    ).length;
  }
  async clearFailures(q: ClearFailuresQuery): Promise<void> {
    this.rows = this.rows.filter((r) => {
      if (r.success) return true;
      const mu = q.userIdInput === undefined || r.userIdInput === q.userIdInput;
      const mi = q.ipAddress === undefined || r.ipAddress === q.ipAddress;
      return !(mu && mi);
    });
  }
}

class AuditLog implements AuditLogRepositoryPort {
  rows: NewAuditLog[] = [];
  async record(e: NewAuditLog): Promise<void> {
    this.rows.push(e);
  }
}

class RoleRepo implements RoleRepositoryPort {
  async list(): Promise<RoleRow[]> {
    return ROLES;
  }
}

class OrgRepo implements OrganizationRepositoryPort {
  rows = new Map<string, OrganizationRow>();
  async list(f: OrganizationListFilter): Promise<{ items: OrganizationRow[]; total: number }> {
    let arr = [...this.rows.values()];
    if (f.scope.kind === 'scoped') {
      const scopeRows = f.scope.rows;
      arr = arr.filter((o) =>
        isWithinScope([], scopeRows, { programId: null, batchId: null, organizationId: o.id }),
      );
    }
    if (f.search) arr = arr.filter((o) => o.name.toLowerCase().includes(f.search!.toLowerCase()));
    if (f.status) arr = arr.filter((o) => o.status === f.status);
    return { items: arr.slice(f.offset, f.offset + f.limit), total: arr.length };
  }
  async findById(id: string): Promise<OrganizationRow | null> {
    return this.rows.get(id) ?? null;
  }
  async findByCode(code: string): Promise<OrganizationRow | null> {
    return [...this.rows.values()].find((o) => o.code === code) ?? null;
  }
  async insert(row: NewOrganization): Promise<void> {
    this.rows.set(row.id, row);
  }
  async update(id: string, patch: OrganizationPatch): Promise<void> {
    const o = this.rows.get(id);
    if (!o) return;
    if (patch.code !== undefined) o.code = patch.code;
    if (patch.name !== undefined) o.name = patch.name;
    o.updatedAt = patch.updatedAt;
  }
  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    const o = this.rows.get(id);
    if (o) {
      o.status = status;
      o.updatedAt = updatedAt;
    }
  }
}

class ProgramRepo implements ProgramRepositoryPort {
  rows = new Map<string, ProgramRow>();
  async list(f: ProgramListFilter): Promise<{ items: ProgramRow[]; total: number }> {
    let arr = [...this.rows.values()];
    if (f.scope.kind === 'scoped') {
      const scopeRows = f.scope.rows;
      arr = arr.filter((p) =>
        isWithinScope([], scopeRows, {
          programId: p.id,
          batchId: null,
          organizationId: p.organizationId,
        }),
      );
    }
    if (f.organizationId) arr = arr.filter((p) => p.organizationId === f.organizationId);
    if (f.search) arr = arr.filter((p) => p.name.toLowerCase().includes(f.search!.toLowerCase()));
    if (f.status) arr = arr.filter((p) => p.status === f.status);
    return { items: arr.slice(f.offset, f.offset + f.limit), total: arr.length };
  }
  async findById(id: string): Promise<ProgramRow | null> {
    return this.rows.get(id) ?? null;
  }
  async findByCode(code: string): Promise<ProgramRow | null> {
    return [...this.rows.values()].find((p) => p.code === code) ?? null;
  }
  async insert(row: NewProgram): Promise<void> {
    const { createdBy: _c, ...rest } = row;
    void _c;
    this.rows.set(row.id, rest);
  }
  async update(id: string, patch: ProgramPatch): Promise<void> {
    const p = this.rows.get(id);
    if (!p) return;
    if (patch.code !== undefined) p.code = patch.code;
    if (patch.name !== undefined) p.name = patch.name;
    if (patch.description !== undefined) p.description = patch.description;
    if (patch.year !== undefined) p.year = patch.year;
    if (patch.startDate !== undefined) p.startDate = patch.startDate;
    if (patch.endDate !== undefined) p.endDate = patch.endDate;
    if (patch.organizationId !== undefined) p.organizationId = patch.organizationId;
    p.updatedAt = patch.updatedAt;
  }
  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    const p = this.rows.get(id);
    if (p) {
      p.status = status;
      p.updatedAt = updatedAt;
    }
  }
}

class BatchRepo implements BatchRepositoryPort {
  rows = new Map<string, BatchRow>();
  constructor(private readonly programs: ProgramRepo) {}
  async list(f: BatchListFilter): Promise<{ items: BatchRow[]; total: number }> {
    let arr = [...this.rows.values()];
    if (f.scope.kind === 'scoped') {
      const scopeRows = f.scope.rows;
      arr = arr.filter((b) => {
        const prog = this.programs.rows.get(b.programId);
        return isWithinScope([], scopeRows, {
          programId: b.programId,
          batchId: b.id,
          organizationId: prog?.organizationId ?? null,
        });
      });
    }
    if (f.programId) arr = arr.filter((b) => b.programId === f.programId);
    if (f.search) arr = arr.filter((b) => b.name.toLowerCase().includes(f.search!.toLowerCase()));
    if (f.status) arr = arr.filter((b) => b.status === f.status);
    return { items: arr.slice(f.offset, f.offset + f.limit), total: arr.length };
  }
  async findById(id: string): Promise<BatchRow | null> {
    return this.rows.get(id) ?? null;
  }
  async findByProgramAndCode(programId: string, code: string): Promise<BatchRow | null> {
    return [...this.rows.values()].find((b) => b.programId === programId && b.code === code) ?? null;
  }
  async insert(row: NewBatch): Promise<void> {
    const { createdBy: _c, ...rest } = row;
    void _c;
    this.rows.set(row.id, rest);
  }
  async update(id: string, patch: BatchPatch): Promise<void> {
    const b = this.rows.get(id);
    if (!b) return;
    if (patch.code !== undefined) b.code = patch.code;
    if (patch.name !== undefined) b.name = patch.name;
    if (patch.description !== undefined) b.description = patch.description;
    if (patch.orderIndex !== undefined) b.orderIndex = patch.orderIndex;
    if (patch.startDate !== undefined) b.startDate = patch.startDate;
    if (patch.endDate !== undefined) b.endDate = patch.endDate;
    b.updatedAt = patch.updatedAt;
  }
  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    const b = this.rows.get(id);
    if (b) {
      b.status = status;
      b.updatedAt = updatedAt;
    }
  }
}

class ScopeRepo implements AdminScopeRepositoryPort {
  byAdmin = new Map<string, AdminScopeRecord[]>();
  async findByAdminUserId(adminUserId: string): Promise<AdminScopeRecord[]> {
    return this.byAdmin.get(adminUserId) ?? [];
  }
  async replaceForAdmin(adminUserId: string, scopes: NewAdminScope[]): Promise<void> {
    this.byAdmin.set(
      adminUserId,
      scopes.map((s) => ({
        id: s.id,
        adminUserId: s.adminUserId,
        programId: s.programId,
        batchId: s.batchId,
        organizationId: s.organizationId,
      })),
    );
  }
}

export interface Harness {
  app: ReturnType<typeof createApp>;
  clock: MutableClock;
  store: UserStore;
  organizations: OrgRepo;
  programs: ProgramRepo;
  batches: BatchRepo;
  scopes: ScopeRepo;
  passwords: PasswordService;
  seedUser(opts: {
    id?: string;
    userId: string;
    password?: string;
    roleCodes?: string[];
    status?: string;
  }): Promise<string>;
  login(userId: string, password: string): Promise<string>;
}

export async function buildHarness(cookieSecure = false): Promise<Harness> {
  const clock = new MutableClock();
  const store = new UserStore();
  const authUsers = new AuthUsers(store);
  const adminUsers = new AdminUsers(store);
  const sessions = new Sessions();
  const loginAttempts = new LoginAttempts();
  const audit = new AuditLog();
  const roles = new RoleRepo();
  const organizations = new OrgRepo();
  const programs = new ProgramRepo();
  const batches = new BatchRepo(programs);
  const scopes = new ScopeRepo();
  const passwords = new PasswordService('test-pepper', 10_000);
  const sessionService = new SessionService(clock, 'session-secret-test');
  const auditWriter = new AdminAuditWriter(audit, clock);

  const authService = new AuthService({
    users: authUsers,
    sessions,
    loginAttempts,
    auditLogs: audit,
    passwords,
    sessionService,
    clock,
    config: {
      pbkdf2Iterations: 10_000,
      sessionTtlSeconds: 3_600,
      adminSessionTtlSeconds: 1_800,
      maxFailedAttempts: 5,
      lockoutWindowSeconds: 900,
      lockoutDurationSeconds: 900,
    },
  });
  const authenticator = new AuthenticationService(sessions, authUsers, sessionService, clock);

  const deps: ApiDeps = {
    healthService: new HealthService({ ping: async () => true }),
    authService,
    authenticator,
    authConfig: { cookieName: 'sarel_session', cookieSecure },
    userAdminService: new UserAdminService({
      users: adminUsers,
      roles,
      sessions,
      scopes,
      passwords,
      clock,
      audit: auditWriter,
    }),
    organizationService: new OrganizationService(organizations, scopes, clock, auditWriter),
    programService: new ProgramService(programs, organizations, scopes, clock, auditWriter),
    batchService: new BatchService(batches, programs, scopes, clock, auditWriter),
    adminScopeService: new AdminScopeService({
      scopes,
      users: adminUsers,
      organizations,
      programs,
      batches,
      sessions,
      clock,
      audit: auditWriter,
    }),
  };

  const app = createApp(deps);

  async function seedUser(opts: {
    id?: string;
    userId: string;
    password?: string;
    roleCodes?: string[];
    status?: string;
  }): Promise<string> {
    const id = opts.id ?? `user_${opts.userId}`;
    const hash = await passwords.hash(opts.password ?? 'Rahasia123');
    const now = '2026-01-01T00:00:00Z';
    store.users.set(id, {
      id,
      userId: opts.userId,
      npk: null,
      fullName: opts.userId,
      email: null,
      phone: null,
      position: null,
      unit: null,
      division: null,
      organizationId: null,
      status: opts.status ?? 'ACTIVE',
      mustChangePassword: false,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      passwordHash: hash,
      roleCodes: (opts.roleCodes ?? ['USER']).map((c) => CODE_TO_ID.get(c) ?? c).map((id2) => ID_TO_CODE.get(id2) ?? id2),
    });
    return id;
  }

  async function login(userId: string, password: string): Promise<string> {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    const setCookie = res.headers.get('set-cookie') ?? '';
    return setCookie.split(';')[0];
  }

  return { app, clock, store, organizations, programs, batches, scopes, passwords, seedUser, login };
}
