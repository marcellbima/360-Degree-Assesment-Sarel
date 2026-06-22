import type { AuditLogRepositoryPort, NewAuditLog } from '@sarel/core';
import type { Db } from '../client';
import { auditLogs } from '../schema/schema';

export class D1AuditLogRepository implements AuditLogRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async record(entry: NewAuditLog): Promise<void> {
    await this.db
      .insert(auditLogs)
      .values({
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
      })
      .run();
  }
}
