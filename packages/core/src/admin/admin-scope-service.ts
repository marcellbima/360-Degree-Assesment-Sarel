import { AppError, MASTER_STATUS_ARCHIVED, type AdminScopeDto } from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type {
  AdminScopeRepositoryPort,
  NewAdminScope,
} from '../ports/admin-scope-repository';
import type { BatchRepositoryPort } from '../ports/batch-repository';
import type { OrganizationRepositoryPort } from '../ports/organization-repository';
import type { ProgramRepositoryPort } from '../ports/program-repository';
import type { SessionAdminRepositoryPort } from '../ports/session-admin-repository';
import type { UserAdminRepositoryPort } from '../ports/user-admin-repository';
import {
  ScopeValidationError,
  assertValidScopeRow,
  scopeKey,
  type AdminScopeRow,
} from '../auth/admin-scope-policy';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import type { AdminContext } from './types';

interface ScopeInput {
  organizationId?: string | null;
  programId?: string | null;
  batchId?: string | null;
}

export interface AdminScopeDeps {
  scopes: AdminScopeRepositoryPort;
  users: UserAdminRepositoryPort;
  organizations: OrganizationRepositoryPort;
  programs: ProgramRepositoryPort;
  batches: BatchRepositoryPort;
  sessions: SessionAdminRepositoryPort;
  clock: ClockPort;
  audit: AdminAuditWriter;
}

function normalizeRow(input: ScopeInput): AdminScopeRow {
  const norm = (v: string | null | undefined): string | null => {
    const t = (v ?? '').trim();
    return t.length === 0 ? null : t;
  };
  return {
    organizationId: norm(input.organizationId),
    programId: norm(input.programId),
    batchId: norm(input.batchId),
  };
}

export class AdminScopeService {
  constructor(private readonly deps: AdminScopeDeps) {}

  private async requireAdminTarget(adminUserId: string): Promise<void> {
    const user = await this.deps.users.findById(adminUserId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'User tidak ditemukan.', 404);
    }
    const roles = await this.deps.users.getRoleCodes(adminUserId);
    if (!roles.includes('ADMIN')) {
      throw new AppError('CONFLICT', 'Scope hanya dapat diberikan kepada user dengan role ADMIN.', 409);
    }
  }

  async getScopes(adminUserId: string): Promise<AdminScopeDto[]> {
    await this.requireAdminTarget(adminUserId);
    const rows = await this.deps.scopes.findByAdminUserId(adminUserId);
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      programId: r.programId,
      batchId: r.batchId,
    }));
  }

  private async validateRow(row: AdminScopeRow): Promise<void> {
    let programOrganizationId: string | null | undefined;
    let batchProgramId: string | null | undefined;
    let batchOrganizationId: string | null | undefined;

    if (row.organizationId) {
      const org = await this.deps.organizations.findById(row.organizationId);
      if (!org || org.status === MASTER_STATUS_ARCHIVED) {
        throw new AppError('VALIDATION_ERROR', 'Organization scope tidak valid atau diarsipkan.', 400);
      }
    }
    if (row.programId) {
      const program = await this.deps.programs.findById(row.programId);
      if (!program || program.status === MASTER_STATUS_ARCHIVED) {
        throw new AppError('VALIDATION_ERROR', 'Program scope tidak valid atau diarsipkan.', 400);
      }
      programOrganizationId = program.organizationId;
    }
    if (row.batchId) {
      const batch = await this.deps.batches.findById(row.batchId);
      if (!batch || batch.status === MASTER_STATUS_ARCHIVED) {
        throw new AppError('VALIDATION_ERROR', 'Batch scope tidak valid atau diarsipkan.', 400);
      }
      batchProgramId = batch.programId;
      const batchProgram = await this.deps.programs.findById(batch.programId);
      batchOrganizationId = batchProgram?.organizationId ?? null;
    }

    try {
      assertValidScopeRow(row, { batchProgramId, programOrganizationId, batchOrganizationId });
    } catch (err) {
      if (err instanceof ScopeValidationError) {
        throw new AppError('VALIDATION_ERROR', err.message, 400);
      }
      throw err;
    }
  }

  async replaceScopes(
    adminUserId: string,
    inputs: ScopeInput[],
    ctx: AdminContext,
  ): Promise<AdminScopeDto[]> {
    await this.requireAdminTarget(adminUserId);

    // Normalisasi + dedupe deterministik.
    const seen = new Set<string>();
    const rows: AdminScopeRow[] = [];
    for (const input of inputs) {
      const row = normalizeRow(input);
      const key = scopeKey(row);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(row);
    }

    for (const row of rows) {
      await this.validateRow(row);
    }

    const now = this.deps.clock.now().toISOString();
    const newScopes: NewAdminScope[] = rows.map((row) => ({
      id: generateId('scope'),
      adminUserId,
      programId: row.programId,
      batchId: row.batchId,
      organizationId: row.organizationId,
      createdAt: now,
      createdBy: ctx.actor.id,
    }));

    await this.deps.scopes.replaceForAdmin(adminUserId, newScopes);

    // Perubahan scope mencabut seluruh session aktif ADMIN tersebut.
    await this.deps.sessions.revokeAllByUserId(adminUserId, now);

    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.ADMIN_SCOPES_CHANGED,
      ctx,
      'admin_scope',
      adminUserId,
      `Jumlah scope: ${newScopes.length}.`,
    );
    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED,
      ctx,
      'user',
      adminUserId,
      'Perubahan admin scope mencabut seluruh session.',
    );

    return newScopes.map((s) => ({
      id: s.id,
      organizationId: s.organizationId,
      programId: s.programId,
      batchId: s.batchId,
    }));
  }
}
