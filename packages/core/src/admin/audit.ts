import type { ClockPort } from '../ports/clock';
import type { AuditLogRepositoryPort } from '../ports/audit-log-repository';
import type { AdminContext } from './types';
import { generateId } from './id';

// Aksi administratif yang wajib dicatat (Phase 4 bagian J).
export const ADMIN_AUDIT_ACTIONS = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_SESSIONS_REVOKED: 'USER_SESSIONS_REVOKED',
  USER_ROLES_CHANGED: 'USER_ROLES_CHANGED',
  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  ORGANIZATION_ARCHIVED: 'ORGANIZATION_ARCHIVED',
  PROGRAM_CREATED: 'PROGRAM_CREATED',
  PROGRAM_UPDATED: 'PROGRAM_UPDATED',
  PROGRAM_ARCHIVED: 'PROGRAM_ARCHIVED',
  BATCH_CREATED: 'BATCH_CREATED',
  BATCH_UPDATED: 'BATCH_UPDATED',
  BATCH_ARCHIVED: 'BATCH_ARCHIVED',
  ADMIN_SCOPES_CHANGED: 'ADMIN_SCOPES_CHANGED',
  // Phase 5
  PARTICIPANT_CREATED: 'PARTICIPANT_CREATED',
  PARTICIPANT_UPDATED: 'PARTICIPANT_UPDATED',
  PARTICIPANT_ACTIVATED: 'PARTICIPANT_ACTIVATED',
  PARTICIPANT_ARCHIVED: 'PARTICIPANT_ARCHIVED',
  PARTICIPANT_BATCH_CHANGED: 'PARTICIPANT_BATCH_CHANGED',
  PARTICIPANT_TARGETS_UPDATED: 'PARTICIPANT_TARGETS_UPDATED',
  EVALUATOR_RELATION_CREATED: 'EVALUATOR_RELATION_CREATED',
  EVALUATOR_RELATION_UPDATED: 'EVALUATOR_RELATION_UPDATED',
  EVALUATOR_RELATION_ACTIVATED: 'EVALUATOR_RELATION_ACTIVATED',
  EVALUATOR_RELATION_ARCHIVED: 'EVALUATOR_RELATION_ARCHIVED',
  PARTICIPANT_IMPORT_PREVIEWED: 'PARTICIPANT_IMPORT_PREVIEWED',
  PARTICIPANT_IMPORT_COMMITTED: 'PARTICIPANT_IMPORT_COMMITTED',
  EVALUATOR_IMPORT_PREVIEWED: 'EVALUATOR_IMPORT_PREVIEWED',
  EVALUATOR_IMPORT_COMMITTED: 'EVALUATOR_IMPORT_COMMITTED',
  IMPORT_FAILED: 'IMPORT_FAILED',
} as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

// Menulis audit log. Reason hanya berisi teks aman; tidak pernah memuat
// password, hash, token, atau secret.
export class AdminAuditWriter {
  constructor(
    private readonly auditLogs: AuditLogRepositoryPort,
    private readonly clock: ClockPort,
  ) {}

  async record(
    action: AdminAuditAction,
    ctx: AdminContext,
    entityType: string,
    entityId: string | null,
    reason: string | null,
  ): Promise<void> {
    await this.auditLogs.record({
      id: generateId('audit'),
      actorId: ctx.actor.id,
      actorRole: ctx.actor.roles[0] ?? null,
      action,
      entityType,
      entityId,
      reason,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      createdAt: this.clock.now().toISOString(),
    });
  }
}
