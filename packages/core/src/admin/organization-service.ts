import {
  AppError,
  MASTER_STATUS_ACTIVE,
  MASTER_STATUS_ARCHIVED,
  type OrganizationDto,
  type Paginated,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type {
  OrganizationRepositoryPort,
  OrganizationRow,
} from '../ports/organization-repository';
import { isWithinScope } from '../auth/admin-scope-policy';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { buildPage, offsetOf, scopeFilterFor, type AdminContext, type ScopeFilter } from './types';

interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}
interface CreateInput {
  code: string;
  name: string;
}
interface UpdateInput {
  code?: string;
  name?: string;
}

export class OrganizationService {
  constructor(
    private readonly repo: OrganizationRepositoryPort,
    private readonly scopes: AdminScopeRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AdminAuditWriter,
  ) {}

  private toDto(row: OrganizationRow): OrganizationDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
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

  async list(query: ListQuery, ctx: AdminContext): Promise<Paginated<OrganizationDto>> {
    const scope = await this.scopeFilter(ctx);
    const { items, total } = await this.repo.list({
      search: query.search,
      status: query.status,
      limit: query.pageSize,
      offset: offsetOf(query.page, query.pageSize),
      scope,
    });
    return buildPage(items.map((r) => this.toDto(r)), total, query.page, query.pageSize);
  }

  private async loadVisible(id: string, ctx: AdminContext): Promise<OrganizationRow> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new AppError('NOT_FOUND', 'Organization tidak ditemukan.', 404);
    }
    const scope = await this.scopeFilter(ctx);
    if (
      scope.kind === 'scoped' &&
      !isWithinScope([], scope.rows, { programId: null, batchId: null, organizationId: id })
    ) {
      throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses ke organization ini.', 403);
    }
    return row;
  }

  async get(id: string, ctx: AdminContext): Promise<OrganizationDto> {
    return this.toDto(await this.loadVisible(id, ctx));
  }

  // Organization adalah entitas puncak; pembuatan hanya dibatasi permission (organization.manage).
  async create(input: CreateInput, ctx: AdminContext): Promise<OrganizationDto> {
    if (await this.repo.findByCode(input.code)) {
      throw new AppError('CONFLICT', 'Kode organization sudah digunakan.', 409);
    }
    const now = this.clock.now().toISOString();
    const row: OrganizationRow = {
      id: generateId('org'),
      code: input.code,
      name: input.name,
      status: MASTER_STATUS_ACTIVE,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insert(row);
    await this.audit.record(
      ADMIN_AUDIT_ACTIONS.ORGANIZATION_CREATED,
      ctx,
      'organization',
      row.id,
      `Kode ${input.code}.`,
    );
    return this.toDto(row);
  }

  async update(id: string, input: UpdateInput, ctx: AdminContext): Promise<OrganizationDto> {
    const row = await this.loadVisible(id, ctx);
    if (input.code && input.code !== row.code) {
      const dup = await this.repo.findByCode(input.code);
      if (dup && dup.id !== id) {
        throw new AppError('CONFLICT', 'Kode organization sudah digunakan.', 409);
      }
    }
    const now = this.clock.now().toISOString();
    await this.repo.update(id, { code: input.code, name: input.name, updatedAt: now });
    await this.audit.record(ADMIN_AUDIT_ACTIONS.ORGANIZATION_UPDATED, ctx, 'organization', id, null);
    return this.toDto({
      ...row,
      code: input.code ?? row.code,
      name: input.name ?? row.name,
      updatedAt: now,
    });
  }

  async setArchived(id: string, archived: boolean, ctx: AdminContext): Promise<OrganizationDto> {
    const row = await this.loadVisible(id, ctx);
    const status = archived ? MASTER_STATUS_ARCHIVED : MASTER_STATUS_ACTIVE;
    const now = this.clock.now().toISOString();
    await this.repo.setStatus(id, status, now);
    await this.audit.record(
      archived ? ADMIN_AUDIT_ACTIONS.ORGANIZATION_ARCHIVED : ADMIN_AUDIT_ACTIONS.ORGANIZATION_UPDATED,
      ctx,
      'organization',
      id,
      archived ? 'Diarsipkan.' : 'Diaktifkan.',
    );
    return this.toDto({ ...row, status, updatedAt: now });
  }
}
