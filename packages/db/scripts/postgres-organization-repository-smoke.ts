import { randomUUID } from 'node:crypto';

import { inArray } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresOrganizationRepository } from '../src/repositories/postgres-organization-repository';
import { organizations } from '../src/schema/postgres-schema';

const connectionString =
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    'DATABASE_URL wajib tersedia.',
  );
}

const suffix = randomUUID().replaceAll('-', '');

const idA = `smoke_org_a_${suffix}`;
const idB = `smoke_org_b_${suffix}`;
const idC = `smoke_org_c_${suffix}`;

const codeA = `SMOKE_ORG_${suffix}_A`;
const codeB = `SMOKE_ORG_${suffix}_B`;
const codeC = `SMOKE_ORG_${suffix}_C`;

const nameA = `Smoke Alpha ${suffix}`;
const nameB = `Smoke Beta ${suffix}`;
const nameC = `Smoke Gamma ${suffix}`;

const createdAt =
  '2026-07-06T08:00:00.000Z';
const updatedAt =
  '2026-07-06T09:00:00.000Z';
const archivedAt =
  '2026-07-06T10:00:00.000Z';

const ids = [idA, idB, idC];

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-organization-smoke',
});

const db = createPostgresDatabase(pool);

const repository =
  new PostgresOrganizationRepository(db);

try {
  await repository.insert({
    id: idA,
    code: codeA,
    name: nameA,
    status: 'ACTIVE',
    createdAt,
    updatedAt: createdAt,
  });

  await repository.insert({
    id: idB,
    code: codeB,
    name: nameB,
    status: 'ARCHIVED',
    createdAt,
    updatedAt: createdAt,
  });

  await repository.insert({
    id: idC,
    code: codeC,
    name: nameC,
    status: 'ACTIVE',
    createdAt,
    updatedAt: createdAt,
  });

  const foundById =
    await repository.findById(idA);

  assert(
    foundById?.code === codeA,
    'findById() gagal.',
  );

  const foundByCode =
    await repository.findByCode(codeB);

  assert(
    foundByCode?.id === idB,
    'findByCode() gagal.',
  );

  const allRows = await repository.list({
    search: suffix,
    limit: 10,
    offset: 0,
    scope: {
      kind: 'all',
    },
  });

  assert(
    allRows.total === 3,
    'list() seharusnya menghasilkan 3 organization.',
  );

  assert(
    allRows.items.map((row) => row.code).join(',') ===
      [codeA, codeB, codeC].join(','),
    'Urutan organization berdasarkan kode tidak sesuai.',
  );

  const pageTwo = await repository.list({
    search: suffix,
    limit: 1,
    offset: 1,
    scope: {
      kind: 'all',
    },
  });

  assert(
    pageTwo.total === 3 &&
      pageTwo.items[0]?.id === idB,
    'Pagination organization gagal.',
  );

  const searched = await repository.list({
    search: `smoke alpha ${suffix}`,
    limit: 10,
    offset: 0,
    scope: {
      kind: 'all',
    },
  });

  assert(
    searched.total === 1 &&
      searched.items[0]?.id === idA,
    'Pencarian case-insensitive gagal.',
  );

  const activeRows = await repository.list({
    search: suffix,
    status: 'ACTIVE',
    limit: 10,
    offset: 0,
    scope: {
      kind: 'all',
    },
  });

  assert(
    activeRows.total === 2,
    'Filter status ACTIVE gagal.',
  );

  const scopedRows = await repository.list({
    search: suffix,
    limit: 10,
    offset: 0,
    scope: {
      kind: 'scoped',
      rows: [
        {
          programId: null,
          batchId: null,
          organizationId: idB,
        },
      ],
    },
  });

  assert(
    scopedRows.total === 1 &&
      scopedRows.items[0]?.id === idB,
    'Organization scope gagal.',
  );

  const programOnlyScope =
    await repository.list({
      search: suffix,
      limit: 10,
      offset: 0,
      scope: {
        kind: 'scoped',
        rows: [
          {
            programId:
              `smoke_program_${suffix}`,
            batchId: null,
            organizationId: null,
          },
        ],
      },
    });

  assert(
    programOnlyScope.total === 0,
    'Program scope tidak boleh membuka daftar organization.',
  );

  const newName =
    `Smoke Alpha Updated ${suffix}`;

  await repository.update(idA, {
    name: newName,
    updatedAt,
  });

  const updated =
    await repository.findById(idA);

  assert(
    updated?.name === newName &&
      updated.code === codeA &&
      toIso(updated.updatedAt) === updatedAt,
    'Partial update organization gagal.',
  );

  await repository.setStatus(
    idC,
    'ARCHIVED',
    archivedAt,
  );

  const archived =
    await repository.findById(idC);

  assert(
    archived?.status === 'ARCHIVED' &&
      toIso(archived.updatedAt) === archivedAt,
    'setStatus() organization gagal.',
  );

  const missing =
    await repository.findById(
      `missing_${suffix}`,
    );

  assert(
    missing === null,
    'Organization yang tidak ada seharusnya menghasilkan null.',
  );

  console.log(
    `Organizations : ${allRows.total}`,
  );
  console.log(
    `Active        : ${activeRows.total}`,
  );
  console.log(
    `Scoped        : ${scopedRows.total}`,
  );
  console.log(
    `Page item     : ${pageTwo.items[0]?.code}`,
  );
  console.log(
    `Final status  : ${archived.status}`,
  );
  console.log(
    'PostgreSQL organization repository berhasil.',
  );
} finally {
  try {
    await db
      .delete(organizations)
      .where(inArray(organizations.id, ids));
  } finally {
    await closePostgresPool(pool);
  }
}
