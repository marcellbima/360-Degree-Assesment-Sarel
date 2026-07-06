import { randomUUID } from 'node:crypto';

import {
  eq,
  inArray,
} from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresLoginAttemptRepository } from '../src/repositories/postgres-login-attempt-repository';
import {
  loginAttempts,
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

const userId = `smoke_login_user_${suffix}`;
const userCode = `SMOKE_LOGIN_USER_${suffix}`;
const otherUserInput =
  `SMOKE_OTHER_USER_${suffix}`;

const targetIp = '192.0.2.10';
const otherIp = '192.0.2.20';

const recentSince =
  '2026-07-06T10:00:00.000Z';

const attemptA = `smoke_login_a_${suffix}`;
const attemptB = `smoke_login_b_${suffix}`;
const attemptC = `smoke_login_c_${suffix}`;
const attemptD = `smoke_login_d_${suffix}`;
const attemptE = `smoke_login_e_${suffix}`;

const attemptIds = [
  attemptA,
  attemptB,
  attemptC,
  attemptD,
  attemptE,
];

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-login-attempt-smoke',
});

const db = createPostgresDatabase(pool);

const repository =
  new PostgresLoginAttemptRepository(db);

try {
  await db.insert(users).values({
    id: userId,
    userId: userCode,
    fullName: 'Smoke Login User',
    passwordHash: 'smoke-password-hash',
    status: 'ACTIVE',
  });

  await repository.record({
    id: attemptA,
    userId,
    userIdInput: userCode,
    success: false,
    ipAddress: targetIp,
    userAgent: 'smoke-agent-a',
    createdAt: '2026-07-06T11:00:00.000Z',
  });

  await repository.record({
    id: attemptB,
    userId,
    userIdInput: userCode,
    success: false,
    ipAddress: otherIp,
    userAgent: 'smoke-agent-b',
    createdAt: '2026-07-06T11:15:00.000Z',
  });

  await repository.record({
    id: attemptC,
    userId,
    userIdInput: userCode,
    success: false,
    ipAddress: targetIp,
    userAgent: null,
    createdAt: '2026-07-06T09:00:00.000Z',
  });

  await repository.record({
    id: attemptD,
    userId,
    userIdInput: userCode,
    success: true,
    ipAddress: targetIp,
    userAgent: 'smoke-agent-success',
    createdAt: '2026-07-06T11:30:00.000Z',
  });

  await repository.record({
    id: attemptE,
    userId: null,
    userIdInput: otherUserInput,
    success: false,
    ipAddress: targetIp,
    userAgent: 'smoke-agent-e',
    createdAt: '2026-07-06T11:45:00.000Z',
  });

  const [storedAttempt] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.id, attemptA))
    .limit(1);

  if (
    !storedAttempt ||
    storedAttempt.userId !== userId ||
    storedAttempt.userIdInput !== userCode ||
    storedAttempt.success !== false ||
    storedAttempt.ipAddress !== targetIp ||
    storedAttempt.userAgent !== 'smoke-agent-a'
  ) {
    throw new Error(
      'record() tidak menyimpan login attempt dengan benar.',
    );
  }

  const failuresByUser =
    await repository.countRecentFailures({
      since: recentSince,
      userIdInput: userCode,
    });

  if (failuresByUser !== 2) {
    throw new Error(
      `Jumlah kegagalan berdasarkan user seharusnya 2, tetapi ditemukan ${failuresByUser}.`,
    );
  }

  const failuresByIp =
    await repository.countRecentFailures({
      since: recentSince,
      ipAddress: targetIp,
    });

  if (failuresByIp !== 2) {
    throw new Error(
      `Jumlah kegagalan berdasarkan IP seharusnya 2, tetapi ditemukan ${failuresByIp}.`,
    );
  }

  const failuresByUserAndIp =
    await repository.countRecentFailures({
      since: recentSince,
      userIdInput: userCode,
      ipAddress: targetIp,
    });

  if (failuresByUserAndIp !== 1) {
    throw new Error(
      `Jumlah kegagalan berdasarkan user dan IP seharusnya 1, tetapi ditemukan ${failuresByUserAndIp}.`,
    );
  }

  const allRecentFailures =
    await repository.countRecentFailures({
      since: recentSince,
    });

  if (allRecentFailures !== 3) {
    throw new Error(
      `Jumlah seluruh kegagalan terbaru seharusnya 3, tetapi ditemukan ${allRecentFailures}.`,
    );
  }

  await repository.clearFailures({
    userIdInput: userCode,
    ipAddress: targetIp,
  });

  const failuresByUserAfterClear =
    await repository.countRecentFailures({
      since: recentSince,
      userIdInput: userCode,
    });

  const failuresByIpAfterClear =
    await repository.countRecentFailures({
      since: recentSince,
      ipAddress: targetIp,
    });

  if (
    failuresByUserAfterClear !== 1 ||
    failuresByIpAfterClear !== 1
  ) {
    throw new Error(
      'clearFailures() menghapus record di luar filter atau gagal menghapus record yang sesuai.',
    );
  }

  const remainingRows = await db
    .select({
      id: loginAttempts.id,
    })
    .from(loginAttempts)
    .where(
      inArray(loginAttempts.id, attemptIds),
    );

  const remainingIds = new Set(
    remainingRows.map((row) => row.id),
  );

  if (
    remainingIds.has(attemptA) ||
    remainingIds.has(attemptC) ||
    !remainingIds.has(attemptB) ||
    !remainingIds.has(attemptD) ||
    !remainingIds.has(attemptE)
  ) {
    throw new Error(
      'Hasil penghapusan login attempt tidak sesuai filter.',
    );
  }

  console.log(
    `Failures by user     : ${failuresByUser}`,
  );
  console.log(
    `Failures by IP       : ${failuresByIp}`,
  );
  console.log(
    `Failures user and IP : ${failuresByUserAndIp}`,
  );
  console.log(
    `Remaining records    : ${remainingIds.size}`,
  );
  console.log(
    'PostgreSQL login attempt repository berhasil.',
  );
} finally {
  try {
    await db
      .delete(loginAttempts)
      .where(
        inArray(loginAttempts.id, attemptIds),
      );

    await db
      .delete(users)
      .where(eq(users.id, userId));
  } finally {
    await closePostgresPool(pool);
  }
}
