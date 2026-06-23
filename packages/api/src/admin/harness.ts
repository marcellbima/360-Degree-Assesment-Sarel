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
  // Phase 5
  AssessmentTargetService,
  EvaluatorRelationService,
  ImportService,
  ParticipantService,
  type AssessmentTypeRepositoryPort,
  type AssessmentTypeRow,
  type ImportCommitRepositoryPort,
  type ImportJobRecord,
  type ImportJobRepositoryPort,
  type ImportJobRowRecord,
  type ImportLookupRepositoryPort,
  type ImportParticipantRef,
  type ImportUserRef,
  type NewImportJob,
  type NewImportJobRow,
  type NewParticipant,
  type NewParticipantTarget,
  type NewRelation,
  type ParticipantListFilter,
  type ParticipantPatch,
  type ParticipantRepositoryPort,
  type ParticipantRow,
  type ParticipantTargetRepositoryPort,
  type ParticipantTargetRow,
  type RelationListFilter,
  type RelationRepositoryPort,
  type RelationRow,
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
  // dari seed 0005 (Phase 5)
  'participant.read',
  'participant.manage',
  'participant.import',
  'evaluator.manage',
  'evaluator.import',
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

// ---- Phase 5 in-memory repos ----
const ASSESS_TYPES: AssessmentTypeRow[] = [
  { id: 'atype_self', code: 'SELF', isSelf: true },
  { id: 'atype_superior', code: 'SUPERIOR', isSelf: false },
  { id: 'atype_peer', code: 'PEER', isSelf: false },
  { id: 'atype_subordinate', code: 'SUBORDINATE', isSelf: false },
];

class AssessmentTypeRepo implements AssessmentTypeRepositoryPort {
  async list(): Promise<AssessmentTypeRow[]> {
    return ASSESS_TYPES;
  }
}

interface StoredParticipant {
  id: string;
  userId: string;
  programId: string;
  batchId: string;
  organizationId: string | null;
  employeeId: string | null;
  position: string | null;
  unit: string | null;
  status: string;
}

class TargetRepo implements ParticipantTargetRepositoryPort {
  byParticipant = new Map<string, ParticipantTargetRow[]>();
  async findByParticipant(id: string): Promise<ParticipantTargetRow[]> {
    return this.byParticipant.get(id) ?? [];
  }
  async replace(id: string, targets: NewParticipantTarget[]): Promise<void> {
    this.byParticipant.set(
      id,
      targets.map((t) => ({ assessmentTypeId: t.assessmentTypeId, targetCount: t.targetCount })),
    );
  }
}

interface StoredRelation {
  id: string;
  programParticipantId: string;
  evaluatorUserId: string;
  assessmentTypeId: string;
  status: string;
}

class ParticipantRepo implements ParticipantRepositoryPort {
  rows = new Map<string, StoredParticipant>();
  relations!: RelationRepo;
  targets!: TargetRepo;
  constructor(
    private readonly store: UserStore,
    private readonly programs: ProgramRepo,
    private readonly batches: BatchRepo,
  ) {}

  toRow(p: StoredParticipant): ParticipantRow {
    const u = this.store.users.get(p.userId);
    const prog = this.programs.rows.get(p.programId);
    const b = this.batches.rows.get(p.batchId);
    return {
      id: p.id,
      userId: p.userId,
      userCode: u?.userId ?? p.userId,
      npk: u?.npk ?? null,
      fullName: u?.fullName ?? '',
      email: u?.email ?? null,
      programId: p.programId,
      programCode: prog?.code ?? '',
      batchId: p.batchId,
      batchCode: b?.code ?? '',
      organizationId: p.organizationId,
      status: p.status,
    };
  }

  async list(filter: ParticipantListFilter): Promise<{ items: ParticipantRow[]; total: number }> {
    let arr = [...this.rows.values()].filter((p) => p.programId === filter.programId);
    if (filter.scope.kind === 'scoped') {
      const rows = filter.scope.rows;
      arr = arr.filter((p) =>
        isWithinScope([], rows, { programId: p.programId, batchId: p.batchId, organizationId: p.organizationId }),
      );
    }
    if (filter.batchId) arr = arr.filter((p) => p.batchId === filter.batchId);
    if (filter.status) arr = arr.filter((p) => p.status === filter.status);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter((p) => {
        const u = this.store.users.get(p.userId);
        return (
          (u?.userId ?? '').toLowerCase().includes(q) || (u?.fullName ?? '').toLowerCase().includes(q)
        );
      });
    }
    const total = arr.length;
    return {
      items: arr.slice(filter.offset, filter.offset + filter.limit).map((p) => this.toRow(p)),
      total,
    };
  }
  async findById(id: string): Promise<ParticipantRow | null> {
    const p = this.rows.get(id);
    return p ? this.toRow(p) : null;
  }
  async findActiveByUserAndProgram(userId: string, programId: string): Promise<ParticipantRow | null> {
    const p = [...this.rows.values()].find(
      (x) => x.userId === userId && x.programId === programId && x.status === 'ACTIVE',
    );
    return p ? this.toRow(p) : null;
  }
  async insert(row: NewParticipant): Promise<void> {
    this.rows.set(row.id, {
      id: row.id,
      userId: row.userId,
      programId: row.programId,
      batchId: row.batchId,
      organizationId: row.organizationId,
      employeeId: row.employeeId,
      position: row.position,
      unit: row.unit,
      status: row.status,
    });
  }
  async update(id: string, patch: ParticipantPatch): Promise<void> {
    const p = this.rows.get(id);
    if (!p) return;
    if (patch.batchId !== undefined) p.batchId = patch.batchId;
    if (patch.position !== undefined) p.position = patch.position;
    if (patch.unit !== undefined) p.unit = patch.unit;
    if (patch.employeeId !== undefined) p.employeeId = patch.employeeId;
  }
  async setStatus(id: string, status: string): Promise<void> {
    const p = this.rows.get(id);
    if (p) p.status = status;
  }
  async hasDependents(participantId: string): Promise<boolean> {
    const rel = this.relations.rows.some((r) => r.programParticipantId === participantId);
    const tgt = (this.targets.byParticipant.get(participantId) ?? []).length > 0;
    return rel || tgt;
  }
  async countActiveRelationsBySubject(participantId: string): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const r of this.relations.rows) {
      if (r.programParticipantId === participantId && r.status === 'ACTIVE') {
        const code = ASSESS_TYPES.find((t) => t.id === r.assessmentTypeId)?.code ?? r.assessmentTypeId;
        out[code] = (out[code] ?? 0) + 1;
      }
    }
    return out;
  }
}

class RelationRepo implements RelationRepositoryPort {
  rows: StoredRelation[] = [];
  participants!: ParticipantRepo;
  constructor(private readonly store: UserStore) {}

  private toRow(r: StoredRelation): RelationRow {
    const subj = this.participants.rows.get(r.programParticipantId);
    const subjUser = subj ? this.store.users.get(subj.userId) : undefined;
    const evalP = subj
      ? [...this.participants.rows.values()].find(
          (p) => p.programId === subj.programId && p.userId === r.evaluatorUserId,
        )
      : undefined;
    const evalUser = this.store.users.get(r.evaluatorUserId);
    return {
      id: r.id,
      programId: subj?.programId ?? '',
      assessmentType: ASSESS_TYPES.find((t) => t.id === r.assessmentTypeId)?.code ?? '',
      assessmentTypeId: r.assessmentTypeId,
      subjectParticipantId: r.programParticipantId,
      subjectUserCode: subjUser?.userId ?? '',
      subjectName: subjUser?.fullName ?? '',
      subjectBatchId: subj?.batchId ?? '',
      subjectOrganizationId: subj?.organizationId ?? null,
      evaluatorUserId: r.evaluatorUserId,
      evaluatorUserCode: evalUser?.userId ?? '',
      evaluatorName: evalUser?.fullName ?? '',
      evaluatorParticipantId: evalP?.id ?? null,
      evaluatorBatchId: evalP?.batchId ?? null,
      evaluatorOrganizationId: evalP?.organizationId ?? null,
      status: r.status,
    };
  }

  async list(filter: RelationListFilter): Promise<{ items: RelationRow[]; total: number }> {
    let arr = this.rows.map((r) => this.toRow(r)).filter((r) => r.programId === filter.programId);
    if (filter.scope.kind === 'scoped') {
      const rows = filter.scope.rows;
      arr = arr.filter((r) =>
        isWithinScope([], rows, {
          programId: r.programId,
          batchId: r.subjectBatchId,
          organizationId: r.subjectOrganizationId,
        }),
      );
    }
    if (filter.assessmentType) arr = arr.filter((r) => r.assessmentType === filter.assessmentType);
    if (filter.subjectBatchId) arr = arr.filter((r) => r.subjectBatchId === filter.subjectBatchId);
    if (filter.evaluatorBatchId) arr = arr.filter((r) => r.evaluatorBatchId === filter.evaluatorBatchId);
    if (filter.status) arr = arr.filter((r) => r.status === filter.status);
    const total = arr.length;
    return { items: arr.slice(filter.offset, filter.offset + filter.limit), total };
  }
  async findById(id: string): Promise<RelationRow | null> {
    const r = this.rows.find((x) => x.id === id);
    return r ? this.toRow(r) : null;
  }
  async findByTriple(
    subjectParticipantId: string,
    evaluatorUserId: string,
    assessmentTypeId: string,
  ): Promise<{ id: string; status: string } | null> {
    const r = this.rows.find(
      (x) =>
        x.programParticipantId === subjectParticipantId &&
        x.evaluatorUserId === evaluatorUserId &&
        x.assessmentTypeId === assessmentTypeId,
    );
    return r ? { id: r.id, status: r.status } : null;
  }
  async insert(row: NewRelation): Promise<void> {
    this.rows.push({
      id: row.id,
      programParticipantId: row.programParticipantId,
      evaluatorUserId: row.evaluatorUserId,
      assessmentTypeId: row.assessmentTypeId,
      status: row.status,
    });
  }
  async setStatus(id: string, status: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id);
    if (r) r.status = status;
  }
  async setType(id: string, assessmentTypeId: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id);
    if (r) r.assessmentTypeId = assessmentTypeId;
  }
}

class ImportJobRepo implements ImportJobRepositoryPort {
  jobs = new Map<string, ImportJobRecord>();
  rowsByJob = new Map<string, ImportJobRowRecord[]>();
  async create(job: NewImportJob, rows: NewImportJobRow[]): Promise<void> {
    this.jobs.set(job.id, {
      id: job.id,
      type: job.type,
      status: job.status,
      createdBy: job.createdBy,
      programId: job.programId,
      fileName: job.fileName,
      checksum: job.checksum,
      totalRows: job.totalRows,
      validRows: job.validRows,
      skippedRows: job.skippedRows,
      errorRows: job.errorRows,
      errorSummary: job.errorSummary,
      committedAt: null,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
    });
    this.rowsByJob.set(
      job.id,
      rows.map((r) => ({
        id: r.id,
        importJobId: job.id,
        rowNumber: r.rowNumber,
        status: r.status,
        message: r.message,
        normalized: r.normalized,
      })),
    );
  }
  async findById(id: string): Promise<ImportJobRecord | null> {
    return this.jobs.get(id) ?? null;
  }
  async listRows(jobId: string): Promise<ImportJobRowRecord[]> {
    return this.rowsByJob.get(jobId) ?? [];
  }
  async setStatus(
    id: string,
    status: string,
    fields: { committedAt?: string | null; errorSummary?: string | null },
  ): Promise<void> {
    const j = this.jobs.get(id);
    if (!j) return;
    j.status = status;
    if (fields.committedAt !== undefined) j.committedAt = fields.committedAt;
    if (fields.errorSummary !== undefined) j.errorSummary = fields.errorSummary;
  }
}

class ImportLookupRepo implements ImportLookupRepositoryPort {
  constructor(
    private readonly store: UserStore,
    private readonly participants: ParticipantRepo,
    private readonly batches: BatchRepo,
    private readonly relations: RelationRepo,
  ) {}
  async findUsersByCodes(codes: string[]): Promise<Map<string, ImportUserRef>> {
    const map = new Map<string, ImportUserRef>();
    for (const u of this.store.users.values()) {
      if (codes.includes(u.userId)) map.set(u.userId, { id: u.id, userCode: u.userId, fullName: u.fullName });
    }
    return map;
  }
  async findBatchCodes(programId: string, codes: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const b of this.batches.rows.values()) {
      if (b.programId === programId && b.status === 'ACTIVE' && codes.includes(b.code)) map.set(b.code, b.id);
    }
    return map;
  }
  async findActiveParticipantUserIds(programId: string): Promise<Set<string>> {
    const set = new Set<string>();
    for (const p of this.participants.rows.values()) {
      if (p.programId === programId && p.status === 'ACTIVE') set.add(p.userId);
    }
    return set;
  }
  async findActiveParticipantsByUserCodes(
    programId: string,
    codes: string[],
  ): Promise<Map<string, ImportParticipantRef>> {
    const map = new Map<string, ImportParticipantRef>();
    for (const p of this.participants.rows.values()) {
      if (p.programId !== programId || p.status !== 'ACTIVE') continue;
      const u = this.store.users.get(p.userId);
      if (u && codes.includes(u.userId)) {
        map.set(u.userId, {
          participantId: p.id,
          userId: p.userId,
          userCode: u.userId,
          batchId: p.batchId,
          organizationId: p.organizationId ?? null,
        });
      }
    }
    return map;
  }
  async findActiveRelationKeys(programId: string): Promise<Set<string>> {
    const set = new Set<string>();
    for (const r of this.relations.rows) {
      const subj = this.participants.rows.get(r.programParticipantId);
      if (subj && subj.programId === programId && r.status === 'ACTIVE') {
        set.add(`${r.programParticipantId}|${r.evaluatorUserId}|${r.assessmentTypeId}`);
      }
    }
    return set;
  }
}

// Fake commit repo: meniru db.batch atomik. Bila failNext aktif, melempar
// SEBELUM menerapkan mutation apa pun, sehingga tidak ada partial write
// (job tidak menjadi COMMITTED, tidak ada participant/relation tersimpan).
class ImportCommitRepo implements ImportCommitRepositoryPort {
  failNext = false;
  constructor(
    private readonly participants: ParticipantRepo,
    private readonly relations: RelationRepo,
    private readonly importJobs: ImportJobRepo,
  ) {}
  async commitParticipants(jobId: string, committedAt: string, participants: NewParticipant[]): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('simulated batch failure');
    }
    for (const p of participants) await this.participants.insert(p);
    await this.importJobs.setStatus(jobId, 'COMMITTED', { committedAt });
  }
  async commitEvaluators(
    jobId: string,
    committedAt: string,
    inserts: NewRelation[],
    reactivateIds: string[],
  ): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('simulated batch failure');
    }
    for (const r of inserts) await this.relations.insert(r);
    for (const id of reactivateIds) await this.relations.setStatus(id, 'ACTIVE');
    await this.importJobs.setStatus(jobId, 'COMMITTED', { committedAt });
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
  participants: ParticipantRepo;
  relations: RelationRepo;
  targets: TargetRepo;
  importJobs: ImportJobRepo;
  importCommit: ImportCommitRepo;
  seedProgram(id: string, organizationId?: string | null): void;
  seedBatch(id: string, programId: string): void;
  seedParticipant(p: {
    id: string;
    userId: string;
    programId: string;
    batchId: string;
    organizationId?: string | null;
    status?: string;
  }): void;
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

  // Phase 5 repos (mutual wiring).
  const assessmentTypes = new AssessmentTypeRepo();
  const targets = new TargetRepo();
  const relations = new RelationRepo(store);
  const participants = new ParticipantRepo(store, programs, batches);
  participants.relations = relations;
  participants.targets = targets;
  relations.participants = participants;
  const importJobs = new ImportJobRepo();
  const importLookup = new ImportLookupRepo(store, participants, batches, relations);
  const importCommit = new ImportCommitRepo(participants, relations, importJobs);

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
    participantService: new ParticipantService({
      participants,
      programs,
      batches,
      users: authUsers,
      targets,
      assessmentTypes,
      scopes,
      clock,
      audit: auditWriter,
    }),
    assessmentTargetService: new AssessmentTargetService({
      participants,
      targets,
      assessmentTypes,
      scopes,
      clock,
      audit: auditWriter,
    }),
    evaluatorRelationService: new EvaluatorRelationService({
      relations,
      participants,
      assessmentTypes,
      scopes,
      clock,
      audit: auditWriter,
    }),
    importService: new ImportService({
      importJobs,
      commit: importCommit,
      lookups: importLookup,
      programs,
      assessmentTypes,
      participants,
      relations,
      scopes,
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

  function seedProgram(id: string, organizationId: string | null = null): void {
    programs.rows.set(id, {
      id,
      code: id,
      name: id,
      description: null,
      year: null,
      startDate: null,
      endDate: null,
      organizationId,
      status: 'ACTIVE',
      createdAt: 'x',
      updatedAt: 'x',
    });
  }
  function seedBatch(id: string, programId: string): void {
    batches.rows.set(id, {
      id,
      programId,
      code: id,
      name: id,
      description: null,
      orderIndex: 0,
      startDate: null,
      endDate: null,
      status: 'ACTIVE',
      createdAt: 'x',
      updatedAt: 'x',
    });
  }
  function seedParticipant(p: {
    id: string;
    userId: string;
    programId: string;
    batchId: string;
    organizationId?: string | null;
    status?: string;
  }): void {
    participants.rows.set(p.id, {
      id: p.id,
      userId: p.userId,
      programId: p.programId,
      batchId: p.batchId,
      organizationId: p.organizationId ?? null,
      employeeId: null,
      position: null,
      unit: null,
      status: p.status ?? 'ACTIVE',
    });
  }

  return {
    app,
    clock,
    store,
    organizations,
    programs,
    batches,
    scopes,
    participants,
    relations,
    targets,
    importJobs,
    importCommit,
    seedProgram,
    seedBatch,
    seedParticipant,
    passwords,
    seedUser,
    login,
  };
}
