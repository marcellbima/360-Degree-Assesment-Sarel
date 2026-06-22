import {
  AppError,
  MASTER_STATUS_ACTIVE,
  MASTER_STATUS_ARCHIVED,
  type BatchDto,
  type Paginated,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { BatchRepositoryPort, BatchRow } from '../ports/batch-repository';
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
  programId?: string;
}
interface CreateInput {
  programId: string;
  code: string;
  name: string;
  description?: string;
  orderIndex?: number;
  startDate?: string;
  endDate?: string;
}
interface UpdateInput {
  code?: string;
  name?: string;
  description?: string;
  orderIndex?: number;
  startDate?: string;
  endDate?: string;
}

function assertDateOrder(start?: string | null, end?: string | null): void {
  if (start && end && start > end) {
    throw new AppError('VALIDATION_ERROR', 'Tanggal mulai tidak boleh setelah tanggal selesai.', 400);
  }
}

export class BatchService {
  constructor(
    private readonly repo: BatchRepositoryPort,
    private readonly programs: ProgramRepositoryPort,
    private readonly scopes: AdminScopeRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AdminAuditWriter,
  ) {}

  private toDto(row: BatchRow): BatchDto {
    return {
      id: row.id,
      programId: row.programId,
      code: row.code,
      name: row.name,
      description: row.description,
      orderIndex: row.orderIndex,
      startDate: row.startDate,
      endDate: row.endDate,
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

  async list(query: ListQuery, ctx: AdminContext): Promise<Paginated<BatchDto>> {
    const scope = await this.scopeFilter(ctx);
    const { items, total } = await this.repo.list({
      search: query.search,
      status: query.status,
      programId: query.programId,
      limit: query.pageSize,
      offset: offsetOf(query.page, query.pageSize),
      scope,
    });
    return buildPage(items.map((r) => this.toDto(r)), total, query.page, query.pageSize);
  }

  private async loadVisible(id: string, ctx: AdminContext): Promise<{ batch: BatchRow; program: ProgramRow | null }> {
    const batch = await this.repo.findById(id);
    if (!batch) {
      throw new AppError('NOT_FOUND', 'Batch tidak ditemukan.', 404);
    }
    const program = await this.programs.findById(batch.programId);
    const scope = await this.scopeFilter(ctx);
    if (
      scope.kind === 'scoped' &&
      !isWithinScope([], scope.rows, {
        programId: batch.programId,
        batchId: id,
        organizationId: program?.organizationId ?? null,
      })
    ) {
      throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses ke batch ini.', 403);
    }
    return { batch, program };
  }

  async get(id: string, ctx: AdminContext): Promise<BatchDto> {
    const { batch } = await this.loadVisible(id, ctx);
    return this.toDto(batch);
  }

  private async requireUsableProgram(programId: string): Promise<ProgramRow> {
    const program = await this.programs.findById(programId);
    if (!program) {
      throw new AppError('NOT_FOUND', 'Program tidak ditemukan.', 404);
    }
    if (program.status === MASTER_STATUS_ARCHIVED) {
      throw new AppError('CONFLICT', 'Program diarsipkan tidak dapat menerima batch baru.', 409);
    }
    return program;
  }

  async create(input: CreateInput, ctx: AdminContext): Promise<BatchDto> {
    const program = await this.requireUsableProgram(input.programId);
    // ADMIN hanya boleh membuat batch di dalam program scope-nya.
    const scope = await this.scopeFilter(ctx);
    if (
      scope.kind === 'scoped' &&
      !isWithinScope([], scope.rows, {
        programId: input.programId,
        batchId: null,
        organizationId: program.organizationId,
      })
    ) {
      throw new AppError('FORBIDDEN', 'Batch berada di luar scope administratif Anda.', 403);
    }
    if (await this.repo.findByProgramAndCode(input.programId, input.code)) {
      throw new AppError('CONFLICT', 'Kode batch sudah digunakan pada program ini.', 409);
    }
    assertDateOrder(input.startDate, input.endDate);
    const now = this.clock.now().toISOString();
    const row: BatchRow = {
      id: generateId('batch'),
      programId: input.programId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      orderIndex: input.orderIndex ?? 0,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: MASTER_STATUS_ACTIVE,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insert({ ...row, createdBy: ctx.actor.id });
    await this.audit.record(ADMIN_AUDIT_ACTIONS.BATCH_CREATED, ctx, 'batch', row.id, `Kode ${input.code}.`);
    return this.toDto(row);
  }

  async update(id: string, input: UpdateInput, ctx: AdminContext): Promise<BatchDto> {
    const { batch } = await this.loadVisible(id, ctx);
    if (batch.status === MASTER_STATUS_ARCHIVED) {
      throw new AppError('CONFLICT', 'Batch diarsipkan tidak dapat menerima konfigurasi baru.', 409);
    }
    if (input.code && input.code !== batch.code) {
      const dup = await this.repo.findByProgramAndCode(batch.programId, input.code);
      if (dup && dup.id !== id) {
        throw new AppError('CONFLICT', 'Kode batch sudah digunakan pada program ini.', 409);
      }
    }
    const startDate = input.startDate ?? batch.startDate;
    const endDate = input.endDate ?? batch.endDate;
    assertDateOrder(startDate, endDate);
    const now = this.clock.now().toISOString();
    await this.repo.update(id, {
      code: input.code,
      name: input.name,
      description: input.description,
      orderIndex: input.orderIndex,
      startDate: input.startDate,
      endDate: input.endDate,
      updatedAt: now,
    });
    await this.audit.record(ADMIN_AUDIT_ACTIONS.BATCH_UPDATED, ctx, 'batch', id, null);
    return this.toDto({
      ...batch,
      code: input.code ?? batch.code,
      name: input.name ?? batch.name,
      description: input.description ?? batch.description,
      orderIndex: input.orderIndex ?? batch.orderIndex,
      startDate,
      endDate,
      updatedAt: now,
    });
  }

  async setArchived(id: string, archived: boolean, ctx: AdminContext): Promise<BatchDto> {
    const { batch } = await this.loadVisible(id, ctx);
    const status = archived ? MASTER_STATUS_ARCHIVED : MASTER_STATUS_ACTIVE;
    const now = this.clock.now().toISOString();
    await this.repo.setStatus(id, status, now);
    await this.audit.record(
      archived ? ADMIN_AUDIT_ACTIONS.BATCH_ARCHIVED : ADMIN_AUDIT_ACTIONS.BATCH_UPDATED,
      ctx,
      'batch',
      id,
      archived ? 'Diarsipkan.' : 'Diaktifkan.',
    );
    return this.toDto({ ...batch, status, updatedAt: now });
  }
}
