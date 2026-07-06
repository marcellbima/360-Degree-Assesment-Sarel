import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresAuditLogRepository } from '../src/repositories/postgres-audit-log-repository';
import {
  auditLogs,
  users,
} from '../src/schema/postgres-schema';

const connectionString =
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    'DATABASE_URL wajib tersedia.',
  );
}

const suffix = randomUUID().replaceAll('-', '');

const actorId = `smoke_audit_user_${suffix}`;
const actorUserCode =
  `SMOKE_AUDIT_USER_${suffix}`;
const auditId = `smoke_audit_${suffix}`;
const requestId =
  `smoke_request_${suffix}`;

const createdAt =
  '2026-07-06T08:30:00.000Z';

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-audit-log-smoke',
});

const db = createPostgresDatabase(pool);

const repository =
  new PostgresAuditLogRepository(db);

try {
  await db.insert(users).values({
    id: actorId,
    userId: actorUserCode,
    fullName: 'Smoke Audit Actor',
    passwordHash: 'smoke-password-hash',
    status: 'ACTIVE',
  });

  await repository.record({
    id: auditId,
    actorId,
    actorRole: 'ADMIN',
    action: 'SMOKE_AUDIT_ACTION',
    entityType: 'smoke_entity',
    entityId: `smoke_entity_${suffix}`,
    reason: 'Smoke test audit repository.',
    ipAddress: '127.0.0.1',
    userAgent: 'sarel-smoke-test',
    requestId,
    createdAt,
  });

  const [row] = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.id, auditId))
    .limit(1);

  if (!row) {
    throw new Error(
      'Audit log tidak ditemukan setelah record().',
    );
  }

  if (
    row.actorId !== actorId ||
    row.actorRole !== 'ADMIN' ||
    row.action !== 'SMOKE_AUDIT_ACTION' ||
    row.entityType !== 'smoke_entity' ||
    row.entityId !==
      `smoke_entity_${suffix}` ||
    row.reason !==
      'Smoke test audit repository.' ||
    row.ipAddress !== '127.0.0.1' ||
    row.userAgent !== 'sarel-smoke-test' ||
    row.requestId !== requestId
  ) {
    throw new Error(
      'Field audit log tidak tersimpan sesuai input.',
    );
  }

  if (
    new Date(row.createdAt).toISOString() !==
    createdAt
  ) {
    throw new Error(
      'createdAt audit log tidak tersimpan dengan benar.',
    );
  }

  console.log(`Audit ID   : ${row.id}`);
  console.log(`Actor      : ${row.actorId}`);
  console.log(`Action     : ${row.action}`);
  console.log(`Request ID : ${row.requestId}`);
  console.log(
    'PostgreSQL audit log repository berhasil.',
  );
} finally {
  try {
    await db
      .delete(auditLogs)
      .where(eq(auditLogs.id, auditId));

    await db
      .delete(users)
      .where(eq(users.id, actorId));
  } finally {
    await closePostgresPool(pool);
  }
}
