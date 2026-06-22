import {
  AppError,
  MASTER_STATUS_ACTIVE,
  MASTER_STATUS_ARCHIVED,
  type Paginated,
  type ProgramDto,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { OrganizationRepositoryPort } from '../ports/organization-repository';
import type { ProgramRepositoryPort, ProgramRow } from '../ports/program-repository';
import { isWithinScope } from '../auth/admin-scope-policy';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { buildPage, offsetOf, scopeFilterFor, type AdminContext, type ScopeFilter } from './types';

interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  organizationId?: string;
}
interface CreateInput {
  code: string;
  name: string;
  description?: string;
  year?: number;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
}
interface UpdateInput {
  code?: string;
  name?: string;
  description?: string;
  year?: number;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
}

function assertDateOrder(start?: string | null, end?: string | null): void {
  if (start && end && start > end) {
    throw new AppError('VALIDATION_ERROR', 'Tanggal mulai tidak boleh setelah tanggal selesai.', 400);
  }
}

export class ProgramService {
  constructor(
    private readonly repo: ProgramRepositoryPort,
    private readonly organizations: OrganizationRepositoryPort,
    private readonly scopes: AdminScopeRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AdminAuditWriter,
  ) {}

  private toDto(row: ProgramRow): ProgramDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      year: row.year,
      startDate: row.startDate,
      endDate: row.endDate,
      organizationId: row.organizationId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async scopeFilter(ctx: AdminContext): Promise<ScopeFilter> {
    if (ctx.actor.roles.includes('SUPERADMIN')) {
      return scopeFilterFor(ctx.actor.roles, []);
    }
    const recs = await this.scopes.findByAdminUserId(ctx.actor.id);
    return scopeFilterFor(
      ctx.actor.roles,
      recs.map((r) => ({ programId: r.programId, batchId: r.batchId, organizationId: r.organizationId })),
    );
  }

  private async requireValidOrganization(organizationId: string | undefined): Promise<void> {
    if (organizationId) {
      const org = await this.organizations.findById(organizationId);
      if (!org) {
        throw new AppError('VALIDATION_ERROR', 'Organization tidak ditemukan.', 400);
      }
    }
  }

  async list(query: ListQuery, ctx: AdminContext): Promise<Paginated<ProgramDto>> {
    const scope = await this.scopeFilter(ctx);
    const { items, total } = await this.repo.list({
      search: query.search,
      status: query.status,
      organizationId: query.organizationId,
      limit: query.pageSize,
      offset: offsetOf(query.page, query.pageSize),
      scope,
    });
    return buildPage(items.map((r) => this.toDto(r)), total, query.page, query.pageSize);
  }

  private async loadVisible(id: string, ctx: AdminContext): Promise<ProgramRow> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new AppError('NOT_FOUND', 'Program tidak ditemukan.', 404);
    }
    const scope = await this.scopeFilter(ctx);
    if (
      scope.kind === 'scoped' &&
      !isWithinScope([], scope.rows, {
        programId: id,
        batchId: null,
        organizationId: row.organizationId,
      })
    ) {
      throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses ke program ini.', 403);
    }
    return row;
  }

  async get(id: string, ctx: AdminContext): Promise<ProgramDto> {
    return this.toDto(await this.loadVisible(id, ctx));
  }

  async create(input: CreateInput, ctx: AdminContext): Promise<ProgramDto> {
    if (await this.repo.findByCode(input.code)) {
      throw new AppError('CONFLICT', 'Kode program sudah digunakan.', 409);
    }
    assertDateOrder(input.startDate, input.endDate);
    await this.requireValidOrganization(input.organizationId);
    // ADMIN hanya boleh membuat program di dalam organization scope-nya.
    const scope = await this.scopeFilter(ctx);
    if (
      scope.kind === 'scoped' &&
      !isWithinScope([], scope.rows, {
        programId: null,
        batchId: null,
        organizationId: input.organizationId ?? null,
      })
    ) {
      throw new AppError('FORBIDDEN', 'Program berada di luar scope administratif Anda.', 403);
    }
    const now = this.clock.now().toISOString();
    const row: ProgramRow = {
      id: generateId('prog'),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      year: input.year ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      organizationId: input.organizationId ?? null,
      status: MASTER_STATUS_ACTIVE,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insert({ ...row, createdBy: ctx.actor.id });
    await this.audit.record(ADMIN_AUDIT_ACTIONS.PROGRAM_CREATED, ctx, 'program', row.id, `Kode ${input.code}.`);
    return this.toDto(row);
  }

  async update(id: string, input: UpdateInput, ctx: AdminContext): Promise<ProgramDto> {
    const row = await this.loadVisible(id, ctx);
    if (input.code && input.code !== row.code) {
      const dup = await this.repo.findByCode(input.code);
      if (dup && dup.id !== id) {
        throw new AppError('CONFLICT', 'Kode program sudah digunakan.', 409);
      }
    }
    const startDate = input.startDate ?? row.startDate;
    const endDate = input.endDate ?? row.endDate;
    assertDateOrder(startDate, endDate);
    await this.requireValidOrganization(input.organizationId);
    const now = this.clock.now().toISOString();
    await this.repo.update(id, {
      code: input.code,
      name: input.name,
      description: input.description,
      year: input.year,
      startDate: input.startDate,
      endDate: input.endDate,
      organizationId: input.organizationId,
      updatedAt: now,
    });
    await this.audit.record(ADMIN_AUDIT_ACTIONS.PROGRAM_UPDATED, ctx, 'program', id, null);
    return this.toDto({
      ...row,
      code: input.code ?? row.code,
      name: input.name ?? row.name,
      description: input.description ?? row.description,
      year: input.year ?? row.year,
      startDate,
      endDate,
      organizationId: input.organizationId ?? row.organizationId,
      updatedAt: now,
    });
  }

  async setArchived(id: string, archived: boolean, ctx: AdminContext): Promise<ProgramDto> {
    const row = await this.loadVisible(id, ctx);
    const status = archived ? MASTER_STATUS_ARCHIVED : MASTER_STATUS_ACTIVE;
    const now = this.clock.now().toISOString();
    await this.repo.setStatus(id, status, now);
    await this.audit.record(
      archived ? ADMIN_AUDIT_ACTIONS.PROGRAM_ARCHIVED : ADMIN_AUDIT_ACTIONS.PROGRAM_UPDATED,
      ctx,
      'program',
      id,
      archived ? 'Diarsipkan.' : 'Diaktifkan.',
    );
    return this.toDto({ ...row, status, updatedAt: now });
  }
}
