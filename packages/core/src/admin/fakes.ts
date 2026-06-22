// In-memory fakes untuk unit test service Phase 4. Bukan file test.
import type { ClockPort } from '../ports/clock';
import type { AuditLogRepositoryPort, NewAuditLog } from '../ports/audit-log-repository';
import type {
  AdminScopeRecord,
  AdminScopeRepositoryPort,
  NewAdminScope,
} from '../ports/admin-scope-repository';
import type { RoleRepositoryPort, RoleRow } from '../ports/role-repository';
import type { SessionAdminRepositoryPort } from '../ports/session-admin-repository';
import type {
  AdminUserRow,
  NewUserRow,
  UserAdminRepositoryPort,
  UserListFilter,
  UserPatch,
} from '../ports/user-admin-repository';
import type {
  NewOrganization,
  OrganizationListFilter,
  OrganizationPatch,
  OrganizationRepositoryPort,
  OrganizationRow,
} from '../ports/organization-repository';
import type {
  NewProgram,
  ProgramListFilter,
  ProgramPatch,
  ProgramRepositoryPort,
  ProgramRow,
} from '../ports/program-repository';
import type {
  BatchListFilter,
  BatchPatch,
  BatchRepositoryPort,
  BatchRow,
  NewBatch,
} from '../ports/batch-repository';
import { isWithinScope, type AdminScopeRow } from '../auth/admin-scope-policy';
import { AdminAuditWriter } from './audit';

export const ROLE_FIXTURES: RoleRow[] = [
  { id: 'role_superadmin', code: 'SUPERADMIN' },
  { id: 'role_admin', code: 'ADMIN' },
  { id: 'role_user', code: 'USER' },
];
const ID_TO_CODE = new Map(ROLE_FIXTURES.map((r) => [r.id, r.code]));
const CODE_TO_ID = new Map(ROLE_FIXTURES.map((r) => [r.code, r.id]));

export class MutableClock implements ClockPort {
  current: Date;
  constructor(initial = new Date('2026-06-22T00:00:00Z')) {
    this.current = initial;
  }
  now(): Date {
    return this.current;
  }
}

export class FakeRoleRepository implements RoleRepositoryPort {
  async list(): Promise<RoleRow[]> {
    return ROLE_FIXTURES;
  }
}

export class FakeAuditRepository implements AuditLogRepositoryPort {
  rows: NewAuditLog[] = [];
  async record(entry: NewAuditLog): Promise<void> {
    this.rows.push(entry);
  }
  actions(): string[] {
    return this.rows.map((r) => r.action);
  }
}

export class FakeSessionAdminRepository implements SessionAdminRepositoryPort {
  active = new Map<string, number>();
  revokedFor: string[] = [];
  setActive(userId: string, count: number): void {
    this.active.set(userId, count);
  }
  async revokeAllByUserId(userId: string, _revokedAt: string): Promise<number> {
    void _revokedAt;
    this.revokedFor.push(userId);
    const n = this.active.get(userId) ?? 0;
    this.active.set(userId, 0);
    return n;
  }
}

interface StoredUser extends AdminUserRow {
  passwordHash: string;
  roleIds: string[];
}

export class FakeUserAdminRepository implements UserAdminRepositoryPort {
  users = new Map<string, StoredUser>();

  seed(row: Partial<StoredUser> & { id: string; userId: string }, roleCodes: string[]): void {
    const now = '2026-01-01T00:00:00Z';
    this.users.set(row.id, {
      id: row.id,
      userId: row.userId,
      npk: row.npk ?? null,
      fullName: row.fullName ?? row.userId,
      email: row.email ?? null,
      phone: row.phone ?? null,
      position: row.position ?? null,
      unit: row.unit ?? null,
      division: row.division ?? null,
      organizationId: row.organizationId ?? null,
      status: row.status ?? 'ACTIVE',
      mustChangePassword: row.mustChangePassword ?? false,
      lastLoginAt: row.lastLoginAt ?? null,
      createdAt: row.createdAt ?? now,
      updatedAt: row.updatedAt ?? now,
      passwordHash: row.passwordHash ?? 'hash',
      roleIds: roleCodes.map((c) => CODE_TO_ID.get(c) ?? c),
    });
  }

  private codesOf(u: StoredUser): string[] {
    return u.roleIds.map((id) => ID_TO_CODE.get(id) ?? id);
  }

  private strip(u: StoredUser): AdminUserRow {
    const { passwordHash: _ph, roleIds: _ri, ...row } = u;
    void _ph;
    void _ri;
    return row;
  }

  async list(filter: UserListFilter): Promise<{ items: AdminUserRow[]; total: number }> {
    let arr = [...this.users.values()];
    if (filter.scope.kind === 'scoped') {
      // Phase 4: relasi user-scope belum tersedia (participant assignment di luar lingkup).
      arr = [];
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter(
        (u) => u.userId.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q),
      );
    }
    if (filter.status) {
      arr = arr.filter((u) => u.status === filter.status);
    }
    if (filter.roleCode) {
      arr = arr.filter((u) => this.codesOf(u).includes(filter.roleCode!));
    }
    arr.sort((a, b) => {
      const dir = filter.sortDir === 'asc' ? 1 : -1;
      const av = String(a[filter.sortBy] ?? '');
      const bv = String(b[filter.sortBy] ?? '');
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    const total = arr.length;
    const items = arr.slice(filter.offset, filter.offset + filter.limit).map((u) => this.strip(u));
    return { items, total };
  }

  async findById(id: string): Promise<AdminUserRow | null> {
    const u = this.users.get(id);
    return u ? this.strip(u) : null;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    return [...this.users.values()].some((u) => u.userId === userId);
  }

  async insert(row: NewUserRow, roleIds: string[]): Promise<void> {
    this.users.set(row.id, {
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
      roleIds,
    });
  }

  async update(id: string, patch: UserPatch): Promise<void> {
    const u = this.users.get(id);
    if (!u) return;
    if (patch.fullName !== undefined) u.fullName = patch.fullName;
    if (patch.npk !== undefined) u.npk = patch.npk;
    if (patch.email !== undefined) u.email = patch.email;
    if (patch.phone !== undefined) u.phone = patch.phone;
    if (patch.position !== undefined) u.position = patch.position;
    if (patch.unit !== undefined) u.unit = patch.unit;
    if (patch.division !== undefined) u.division = patch.division;
    if (patch.organizationId !== undefined) u.organizationId = patch.organizationId;
    u.updatedAt = patch.updatedAt;
  }

  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    const u = this.users.get(id);
    if (u) {
      u.status = status;
      u.updatedAt = updatedAt;
    }
  }

  async setPasswordHash(id: string, passwordHash: string, updatedAt: string): Promise<void> {
    const u = this.users.get(id);
    if (u) {
      u.passwordHash = passwordHash;
      u.updatedAt = updatedAt;
    }
  }

  async getRoleCodes(id: string): Promise<string[]> {
    const u = this.users.get(id);
    return u ? this.codesOf(u) : [];
  }

  async getRoleCodesForUsers(ids: string[]): Promise<Record<string, string[]>> {
    const out: Record<string, string[]> = {};
    for (const id of ids) {
      const u = this.users.get(id);
      if (u) out[id] = this.codesOf(u);
    }
    return out;
  }

  async replaceRoles(id: string, roleIds: string[]): Promise<void> {
    const u = this.users.get(id);
    if (u) u.roleIds = roleIds;
  }

  async countActiveSuperadmins(): Promise<number> {
    return [...this.users.values()].filter(
      (u) => u.status === 'ACTIVE' && this.codesOf(u).includes('SUPERADMIN'),
    ).length;
  }

  async isUserInScope(_targetUserId: string, _scopes: AdminScopeRow[]): Promise<boolean> {
    void _targetUserId;
    void _scopes;
    // Relasi user-scope belum tersedia pada Phase 4.
    return false;
  }
}

export class FakeOrganizationRepository implements OrganizationRepositoryPort {
  rows = new Map<string, OrganizationRow>();
  seed(row: OrganizationRow): void {
    this.rows.set(row.id, row);
  }
  async list(filter: OrganizationListFilter): Promise<{ items: OrganizationRow[]; total: number }> {
    let arr = [...this.rows.values()];
    if (filter.scope.kind === 'scoped') {
      arr = arr.filter((o) =>
        isWithinScope([], filter.scope.kind === 'scoped' ? filter.scope.rows : [], {
          programId: null,
          batchId: null,
          organizationId: o.id,
        }),
      );
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q));
    }
    if (filter.status) arr = arr.filter((o) => o.status === filter.status);
    const total = arr.length;
    return { items: arr.slice(filter.offset, filter.offset + filter.limit), total };
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

export class FakeProgramRepository implements ProgramRepositoryPort {
  rows = new Map<string, ProgramRow>();
  seed(row: ProgramRow): void {
    this.rows.set(row.id, row);
  }
  async list(filter: ProgramListFilter): Promise<{ items: ProgramRow[]; total: number }> {
    let arr = [...this.rows.values()];
    if (filter.scope.kind === 'scoped') {
      arr = arr.filter((p) =>
        isWithinScope([], filter.scope.kind === 'scoped' ? filter.scope.rows : [], {
          programId: p.id,
          batchId: null,
          organizationId: p.organizationId,
        }),
      );
    }
    if (filter.organizationId) arr = arr.filter((p) => p.organizationId === filter.organizationId);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    }
    if (filter.status) arr = arr.filter((p) => p.status === filter.status);
    const total = arr.length;
    return { items: arr.slice(filter.offset, filter.offset + filter.limit), total };
  }
  async findById(id: string): Promise<ProgramRow | null> {
    return this.rows.get(id) ?? null;
  }
  async findByCode(code: string): Promise<ProgramRow | null> {
    return [...this.rows.values()].find((p) => p.code === code) ?? null;
  }
  async insert(row: NewProgram): Promise<void> {
    const { createdBy: _cb, ...rest } = row;
    void _cb;
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

export class FakeBatchRepository implements BatchRepositoryPort {
  rows = new Map<string, BatchRow>();
  seed(row: BatchRow): void {
    this.rows.set(row.id, row);
  }
  async list(filter: BatchListFilter): Promise<{ items: BatchRow[]; total: number }> {
    let arr = [...this.rows.values()];
    if (filter.programId) arr = arr.filter((b) => b.programId === filter.programId);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter((b) => b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
    }
    if (filter.status) arr = arr.filter((b) => b.status === filter.status);
    const total = arr.length;
    return { items: arr.slice(filter.offset, filter.offset + filter.limit), total };
  }
  async findById(id: string): Promise<BatchRow | null> {
    return this.rows.get(id) ?? null;
  }
  async findByProgramAndCode(programId: string, code: string): Promise<BatchRow | null> {
    return (
      [...this.rows.values()].find((b) => b.programId === programId && b.code === code) ?? null
    );
  }
  async insert(row: NewBatch): Promise<void> {
    const { createdBy: _cb, ...rest } = row;
    void _cb;
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

export class FakeAdminScopeRepository implements AdminScopeRepositoryPort {
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

export function makeAuditWriter(clock: ClockPort): {
  writer: AdminAuditWriter;
  repo: FakeAuditRepository;
} {
  const repo = new FakeAuditRepository();
  return { writer: new AdminAuditWriter(repo, clock), repo };
}
