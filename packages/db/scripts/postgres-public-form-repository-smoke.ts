import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import type { PublicFormDefinition } from '@sarel/core';
import { asc, count, eq, inArray } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresPublicFormRepository } from '../src/repositories/postgres-public-form-repository';
import { publicForms, publicFormVersions, users } from '../src/schema/postgres-schema';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL wajib tersedia.');
}

const suffix = randomUUID().replaceAll('-', '');

const actorId = `smoke_public_form_actor_${suffix}`;

const actorUserId = `SMOKE_PUBLIC_FORM_${suffix}`;

const publishedFormId = `smoke_public_form_published_${suffix}`;

const draftFormId = `smoke_public_form_draft_${suffix}`;

const publishedSlug = `smoke-published-${suffix}`;

const draftSlug = `smoke-draft-${suffix}`;

const versionAId = `smoke_public_form_version_a_${suffix}`;

const versionBId = `smoke_public_form_version_b_${suffix}`;

const createdAt = '2026-07-20T01:00:00.000Z';

const publishedAtA = '2026-07-20T02:00:00.000Z';

const publishedAtB = '2026-07-20T03:00:00.000Z';

const definitionA: PublicFormDefinition = {
  title: 'Smoke Public Form Version A',
  description: 'Snapshot A untuk pengujian transaksi.',
  sections: [],
};

const definitionB: PublicFormDefinition = {
  title: 'Smoke Public Form Version B',
  description: 'Snapshot B untuk pengujian transaksi.',
  sections: [],
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function definitionsMatch(actual: unknown, expected: PublicFormDefinition): boolean {
  /*
   * PostgreSQL jsonb tidak mempertahankan
   * urutan key. Bandingkan struktur objek.
   */
  return isDeepStrictEqual(actual, expected);
}

const pool = createPostgresPool({
  connectionString,
  max: 4,
  applicationName: 'sarel-assessment-public-form-smoke',
});

const db = createPostgresDatabase(pool);

const repository = new PostgresPublicFormRepository(db);

let runError: unknown = null;
let cleanupError: unknown = null;

try {
  await db.insert(users).values({
    id: actorId,
    userId: actorUserId,
    fullName: 'Smoke Public Form Actor',
    passwordHash: 'smoke-password-hash',
    status: 'ACTIVE',
  });

  await repository.insert({
    id: publishedFormId,
    slug: publishedSlug,
    title: 'Smoke Published Form',
    description: 'Form sementara untuk smoke test.',
    status: 'DRAFT',
    draftDefinition: definitionA,
    googleSheetsEnabled: false,
    googleSheetsWebhookUrl: null,
    createdBy: actorId,
    createdAt,
    updatedAt: createdAt,
  });

  /*
   * Kedua transaksi sengaja dijalankan
   * bersamaan. Row lock pada parent form
   * harus membuat nomor versinya tetap
   * berurutan dan unik.
   */
  const publishedVersions = await Promise.all([
    repository.publish(publishedFormId, {
      versionId: versionAId,
      publishedDefinition: definitionA,
      opensAt: null,
      closesAt: null,
      publishedAt: publishedAtA,
      updatedAt: publishedAtA,
      createdBy: actorId,
    }),
    repository.publish(publishedFormId, {
      versionId: versionBId,
      publishedDefinition: definitionB,
      opensAt: null,
      closesAt: null,
      publishedAt: publishedAtB,
      updatedAt: publishedAtB,
      createdBy: actorId,
    }),
  ]);

  assert(publishedVersions.length === 2, 'Publish bersamaan tidak menghasilkan dua versi.');

  const returnedNumbers = publishedVersions.map((row) => row.versionNumber).sort((a, b) => a - b);

  assert(
    returnedNumbers[0] === 1 && returnedNumbers[1] === 2,
    `Nomor versi hasil Publish tidak valid: ${returnedNumbers.join(', ')}.`,
  );

  const storedVersions = await db
    .select()
    .from(publicFormVersions)
    .where(eq(publicFormVersions.publicFormId, publishedFormId))
    .orderBy(asc(publicFormVersions.versionNumber));

  assert(
    storedVersions.length === 2,
    `Database menyimpan ${storedVersions.length} versi, seharusnya 2.`,
  );

  assert(
    storedVersions[0]?.versionNumber === 1 && storedVersions[1]?.versionNumber === 2,
    'Nomor versi dalam database tidak berurutan 1 dan 2.',
  );

  const storedById = new Map(storedVersions.map((row) => [row.id, row]));

  const storedA = storedById.get(versionAId);

  const storedB = storedById.get(versionBId);

  assert(storedA !== undefined, 'Snapshot versi A tidak ditemukan.');

  assert(storedB !== undefined, 'Snapshot versi B tidak ditemukan.');

  assert(
    storedA.createdBy === actorId && storedB.createdBy === actorId,
    'Actor pembuat versi tidak tersimpan dengan benar.',
  );

  assert(definitionsMatch(storedA.definition, definitionA), 'Isi snapshot versi A berubah.');

  assert(definitionsMatch(storedB.definition, definitionB), 'Isi snapshot versi B berubah.');

  const protectedDelete = await repository.deleteById(publishedFormId);

  assert(protectedDelete === false, 'Form yang memiliki versi historis masih dapat dihapus.');

  const publishedForm = await repository.findById(publishedFormId);

  assert(
    publishedForm !== null,
    'Form terpublikasi hilang setelah Delete yang seharusnya ditolak.',
  );

  await repository.insert({
    id: draftFormId,
    slug: draftSlug,
    title: 'Smoke Draft Form',
    description: 'Draft sementara untuk smoke test.',
    status: 'DRAFT',
    draftDefinition: definitionA,
    googleSheetsEnabled: false,
    googleSheetsWebhookUrl: null,
    createdBy: actorId,
    createdAt,
    updatedAt: createdAt,
  });

  const draftDeleted = await repository.deleteById(draftFormId);

  assert(draftDeleted === true, 'Draft tanpa versi tidak berhasil dihapus.');

  const deletedDraft = await repository.findById(draftFormId);

  assert(deletedDraft === null, 'Draft masih ditemukan setelah Delete berhasil.');

  console.log('Concurrent Publish : OK');

  console.log('Version sequence   : 1, 2');

  console.log('Immutable snapshots: OK');

  console.log('Historical delete  : BLOCKED');

  console.log('Draft delete       : OK');
} catch (error) {
  runError = error;
} finally {
  try {
    await db
      .delete(publicFormVersions)
      .where(inArray(publicFormVersions.id, [versionAId, versionBId]));

    await db.delete(publicForms).where(inArray(publicForms.id, [publishedFormId, draftFormId]));

    await db.delete(users).where(eq(users.id, actorId));

    const [remainingVersions] = await db
      .select({
        value: count(),
      })
      .from(publicFormVersions)
      .where(inArray(publicFormVersions.id, [versionAId, versionBId]));

    const [remainingForms] = await db
      .select({
        value: count(),
      })
      .from(publicForms)
      .where(inArray(publicForms.id, [publishedFormId, draftFormId]));

    const [remainingActors] = await db
      .select({
        value: count(),
      })
      .from(users)
      .where(eq(users.id, actorId));

    assert(Number(remainingVersions?.value ?? 0) === 0, 'Cleanup versi smoke test tidak tuntas.');

    assert(Number(remainingForms?.value ?? 0) === 0, 'Cleanup form smoke test tidak tuntas.');

    assert(Number(remainingActors?.value ?? 0) === 0, 'Cleanup actor smoke test tidak tuntas.');

    console.log('Cleanup            : OK');
  } catch (error) {
    cleanupError = error;
  }

  await closePostgresPool(pool);
}

if (runError) {
  throw runError;
}

if (cleanupError) {
  throw cleanupError;
}

console.log('PostgresPublicFormRepository smoke test berhasil.');
