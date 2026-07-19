import { randomUUID } from 'node:crypto';

import { inArray } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresSessionRepository } from '../src/repositories/postgres-session-repository';
import {
  sessions,
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

const userId =
  `smoke_session_user_${suffix}`;
const otherUserId =
  `smoke_session_other_user_${suffix}`;

const userCode =
  `SMOKE_SESSION_USER_${suffix}`;
const otherUserCode =
  `SMOKE_SESSION_OTHER_${suffix}`;

const sessionId1 =
  `smoke_session_1_${suffix}`;
const sessionId2 =
  `smoke_session_2_${suffix}`;
const sessionId3 =
  `smoke_session_3_${suffix}`;
const sessionId4 =
  `smoke_session_4_${suffix}`;

const tokenHash1 =
  `smoke-token-hash-1-${suffix}`;
const tokenHash2 =
  `smoke-token-hash-2-${suffix}`;
const tokenHash3 =
  `smoke-token-hash-3-${suffix}`;
const tokenHash4 =
  `smoke-token-hash-4-${suffix}`;

const createdAt =
  '2026-07-06T08:00:00.000Z';
const expiresAt =
  '2026-07-06T18:00:00.000Z';
const firstRevokedAt =
  '2026-07-06T09:00:00.000Z';
const bulkRevokedAt =
  '2026-07-06T10:00:00.000Z';

const sessionIds = [
  sessionId1,
  sessionId2,
  sessionId3,
  sessionId4,
];

function toIso(
  value: string | null,
): string | null {
  return value
    ? new Date(value).toISOString()
    : null;
}

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-session-repository-smoke',
});

const db = createPostgresDatabase(pool);

const repository =
  new PostgresSessionRepository(db);

try {
  await db.insert(users).values([
    {
      id: userId,
      userId: userCode,
      fullName: 'Smoke Session User',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
    {
      id: otherUserId,
      userId: otherUserCode,
      fullName: 'Smoke Other Session User',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
  ]);

  await repository.create({
    id: sessionId1,
    userId,
    tokenHash: tokenHash1,
    expiresAt,
    createdAt,
  });

  await repository.create({
    id: sessionId2,
    userId,
    tokenHash: tokenHash2,
    expiresAt,
    createdAt,
  });

  await repository.create({
    id: sessionId3,
    userId,
    tokenHash: tokenHash3,
    expiresAt,
    createdAt,
  });

  await repository.create({
    id: sessionId4,
    userId: otherUserId,
    tokenHash: tokenHash4,
    expiresAt,
    createdAt,
  });

  const found =
    await repository.findByTokenHash(
      tokenHash1,
    );

  if (
    !found ||
    found.id !== sessionId1 ||
    found.userId !== userId ||
    found.tokenHash !== tokenHash1 ||
    toIso(found.expiresAt) !== expiresAt ||
    toIso(found.createdAt) !== createdAt ||
    found.revokedAt !== null
  ) {
    throw new Error(
      'create() atau findByTokenHash() tidak menghasilkan session yang diharapkan.',
    );
  }

  const missing =
    await repository.findByTokenHash(
      `missing-${suffix}`,
    );

  if (missing !== null) {
    throw new Error(
      'findByTokenHash() seharusnya menghasilkan null untuk token yang tidak ada.',
    );
  }

  await repository.revokeByTokenHash(
    tokenHash1,
    firstRevokedAt,
  );

  const revokedSession =
    await repository.findByTokenHash(
      tokenHash1,
    );

  if (
    !revokedSession ||
    toIso(revokedSession.revokedAt) !==
      firstRevokedAt
  ) {
    throw new Error(
      'revokeByTokenHash() gagal mencabut session.',
    );
  }

  const revokedCount =
    await repository.revokeAllByUserId(
      userId,
      bulkRevokedAt,
    );

  if (revokedCount !== 2) {
    throw new Error(
      `revokeAllByUserId() seharusnya mencabut 2 session, tetapi mencabut ${revokedCount}.`,
    );
  }

  const secondRevokedCount =
    await repository.revokeAllByUserId(
      userId,
      bulkRevokedAt,
    );

  if (secondRevokedCount !== 0) {
    throw new Error(
      'Pemanggilan kedua revokeAllByUserId() seharusnya menghasilkan 0.',
    );
  }

  const rows = await db
    .select({
      id: sessions.id,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(
      inArray(sessions.id, sessionIds),
    );

  const rowsById = new Map(
    rows.map((row) => [row.id, row]),
  );

  if (
    toIso(
      rowsById.get(sessionId1)?.revokedAt ??
        null,
    ) !== firstRevokedAt ||
    toIso(
      rowsById.get(sessionId2)?.revokedAt ??
        null,
    ) !== bulkRevokedAt ||
    toIso(
      rowsById.get(sessionId3)?.revokedAt ??
        null,
    ) !== bulkRevokedAt ||
    rowsById.get(sessionId4)?.revokedAt !==
      null
  ) {
    throw new Error(
      'Hasil pencabutan session tidak sesuai user atau status aktif.',
    );
  }

  console.log(
    `Session found       : ${found.id}`,
  );
  console.log(
    `Single revoke       : ${firstRevokedAt}`,
  );
  console.log(
    `Bulk revoked count  : ${revokedCount}`,
  );
  console.log(
    `Second revoke count : ${secondRevokedCount}`,
  );
  console.log(
    'PostgreSQL session repository berhasil.',
  );
} finally {
  try {
    await db
      .delete(sessions)
      .where(
        inArray(sessions.id, sessionIds),
      );

    await db
      .delete(users)
      .where(
        inArray(users.id, [
          userId,
          otherUserId,
        ]),
      );
  } finally {
    await closePostgresPool(pool);
  }
}
