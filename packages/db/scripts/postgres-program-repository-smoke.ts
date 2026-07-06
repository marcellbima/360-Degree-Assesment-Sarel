import { randomUUID } from 'node:crypto';

import { inArray } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';

import {
  PostgresProgramRepository,
} from '../src/repositories/postgres-program-repository';

import {
  organizations,
  programs,
} from '../src/schema/postgres-schema';

const connectionString =
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    'DATABASE_URL wajib tersedia.',
  );
}

const suffix =
  randomUUID().replaceAll('-', '');

const organizationIdA =
  `smoke_program_org_a_${suffix}`;

const organizationIdB =
  `smoke_program_org_b_${suffix}`;

const programIdA =
  `smoke_program_a_${suffix}`;

const programIdB =
  `smoke_program_b_${suffix}`;

const programIdC =
  `smoke_program_c_${suffix}`;

const codeA =
  `SMOKE_PROGRAM_${suffix}_A`;

const codeB =
  `SMOKE_PROGRAM_${suffix}_B`;

const codeC =
  `SMOKE_PROGRAM_${suffix}_C`;

const createdAt =
  '2026-07-06T08:00:00.000Z';

const updatedAt =
  '2026-07-06T09:00:00.000Z';

const archivedAt =
  '2026-07-06T10:00:00.000Z';

const organizationIds = [
  organizationIdA,
  organizationIdB,
];

const programIds = [
  programIdA,
  programIdB,
  programIdC,
];

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function toIso(
  value: string,
): string {
  return new Date(value).toISOString();
}

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-program-repository-smoke',
});

const db =
  createPostgresDatabase(pool);

const repository =
  new PostgresProgramRepository(db);

try {
  await db
    .insert(organizations)
    .values([
      {
        id: organizationIdA,
        code:
          `SMOKE_PROGRAM_ORG_A_${suffix}`,
        name:
          'Smoke Program Organization A',
        status: 'ACTIVE',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: organizationIdB,
        code:
          `SMOKE_PROGRAM_ORG_B_${suffix}`,
        name:
          'Smoke Program Organization B',
        status: 'ACTIVE',
        createdAt,
        updatedAt: createdAt,
      },
    ]);

  await repository.insert({
    id: programIdA,
    code: codeA,
    name: `Smoke Alpha ${suffix}`,
    description: 'Program Alpha',
    year: 2026,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    organizationId: organizationIdA,
    status: 'ACTIVE',
    createdAt,
    updatedAt: createdAt,
    createdBy: null,
  });

  await repository.insert({
    id: programIdB,
    code: codeB,
    name: `Smoke Beta ${suffix}`,
    description: 'Program Beta',
    year: 2026,
    startDate: '2026-02-01',
    endDate: '2026-07-31',
    organizationId: organizationIdA,
    status: 'ARCHIVED',
    createdAt,
    updatedAt: createdAt,
    createdBy: null,
  });

  await repository.insert({
    id: programIdC,
    code: codeC,
    name: `Smoke Gamma ${suffix}`,
    description: null,
    year: null,
    startDate: null,
    endDate: null,
    organizationId: organizationIdB,
    status: 'ACTIVE',
    createdAt,
    updatedAt: createdAt,
    createdBy: null,
  });

  const foundById =
    await repository.findById(
      programIdA,
    );

  assert(
    foundById?.code === codeA &&
      foundById.organizationId ===
        organizationIdA,
    'findById() gagal.',
  );

  const foundByCode =
    await repository.findByCode(
      codeB,
    );

  assert(
    foundByCode?.id === programIdB,
    'findByCode() gagal.',
  );

  const allPrograms =
    await repository.list({
      search: suffix,
      limit: 10,
      offset: 0,
      scope: {
        kind: 'all',
      },
    });

  assert(
    allPrograms.total === 3,
    'list() seharusnya menghasilkan 3 program.',
  );

  const allCodes =
    allPrograms.items.map(
      (row) => row.code,
    );

  assert(
    allCodes.join(',') ===
      [codeA, codeB, codeC].join(','),
    'Urutan program berdasarkan kode tidak sesuai.',
  );

  const paginated =
    await repository.list({
      search: suffix,
      limit: 1,
      offset: 1,
      scope: {
        kind: 'all',
      },
    });

  assert(
    paginated.total === 3 &&
      paginated.items[0]?.id ===
        programIdB,
    'Pagination program gagal.',
  );

  const searched =
    await repository.list({
      search:
        `sMoKe aLpHa ${suffix}`,
      limit: 10,
      offset: 0,
      scope: {
        kind: 'all',
      },
    });

  assert(
    searched.total === 1 &&
      searched.items[0]?.id ===
        programIdA,
    'Pencarian case-insensitive gagal.',
  );

  const activePrograms =
    await repository.list({
      search: suffix,
      status: 'ACTIVE',
      limit: 10,
      offset: 0,
      scope: {
        kind: 'all',
      },
    });

  assert(
    activePrograms.total === 2,
    'Filter status ACTIVE gagal.',
  );

  const organizationPrograms =
    await repository.list({
      search: suffix,
      organizationId:
        organizationIdA,
      limit: 10,
      offset: 0,
      scope: {
        kind: 'all',
      },
    });

  assert(
    organizationPrograms.total === 2,
    'Filter organization gagal.',
  );

  const programScoped =
    await repository.list({
      search: suffix,
      limit: 10,
      offset: 0,
      scope: {
        kind: 'scoped',
        rows: [
          {
            programId: programIdB,
            batchId: null,
            organizationId: null,
          },
        ],
      },
    });

  assert(
    programScoped.total === 1 &&
      programScoped.items[0]?.id ===
        programIdB,
    'Program-level scope gagal.',
  );

  const organizationScoped =
    await repository.list({
      search: suffix,
      limit: 10,
      offset: 0,
      scope: {
        kind: 'scoped',
        rows: [
          {
            programId: null,
            batchId: null,
            organizationId:
              organizationIdB,
          },
        ],
      },
    });

  assert(
    organizationScoped.total === 1 &&
      organizationScoped.items[0]?.id ===
        programIdC,
    'Organization-level scope gagal.',
  );

  const batchOnlyScoped =
    await repository.list({
      search: suffix,
      limit: 10,
      offset: 0,
      scope: {
        kind: 'scoped',
        rows: [
          {
            programId: null,
            batchId:
              `smoke_batch_${suffix}`,
            organizationId: null,
          },
        ],
      },
    });

  assert(
    batchOnlyScoped.total === 0,
    'Batch-only scope tidak boleh membuka daftar program.',
  );

  const updatedName =
    `Smoke Alpha Updated ${suffix}`;

  await repository.update(
    programIdA,
    {
      name: updatedName,
      description: null,
      year: null,
      startDate: null,
      endDate: null,
      organizationId:
        organizationIdB,
      updatedAt,
    },
  );

  const updatedProgram =
    await repository.findById(
      programIdA,
    );

  assert(
    updatedProgram?.name ===
      updatedName &&
      updatedProgram.code === codeA &&
      updatedProgram.description ===
        null &&
      updatedProgram.year === null &&
      updatedProgram.startDate ===
        null &&
      updatedProgram.endDate === null &&
      updatedProgram.organizationId ===
        organizationIdB &&
      toIso(
        updatedProgram.updatedAt,
      ) === updatedAt,
    'Partial update program gagal.',
  );

  await repository.setStatus(
    programIdC,
    'ARCHIVED',
    archivedAt,
  );

  const archivedProgram =
    await repository.findById(
      programIdC,
    );

  assert(
    archivedProgram?.status ===
      'ARCHIVED' &&
      toIso(
        archivedProgram.updatedAt,
      ) === archivedAt,
    'setStatus() program gagal.',
  );

  const missingById =
    await repository.findById(
      `missing_program_${suffix}`,
    );

  const missingByCode =
    await repository.findByCode(
      `MISSING_PROGRAM_${suffix}`,
    );

  assert(
    missingById === null &&
      missingByCode === null,
    'Program yang tidak ada seharusnya menghasilkan null.',
  );

  console.log(
    `Programs       : ${allPrograms.total}`,
  );

  console.log(
    `Active         : ${activePrograms.total}`,
  );

  console.log(
    `Organization A : ${organizationPrograms.total}`,
  );

  console.log(
    `Program scope  : ${programScoped.total}`,
  );

  console.log(
    `Final status   : ${archivedProgram.status}`,
  );

  console.log(
    'PostgreSQL program repository berhasil.',
  );
} finally {
  try {
    await db
      .delete(programs)
      .where(
        inArray(
          programs.id,
          programIds,
        ),
      );

    await db
      .delete(organizations)
      .where(
        inArray(
          organizations.id,
          organizationIds,
        ),
      );
  } finally {
    await closePostgresPool(pool);
  }
}
