import type {
  AuditLogRepositoryPort,
  NewAuditLog,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import { auditLogs } from '../schema/postgres-schema';

export class PostgresAuditLogRepository
  implements AuditLogRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async record(entry: NewAuditLog): Promise<void> {
    await this.db.insert(auditLogs).values({
      id: entry.id,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      reason: entry.reason,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      requestId: entry.requestId,
      createdAt: entry.createdAt,
    });
  }
}
