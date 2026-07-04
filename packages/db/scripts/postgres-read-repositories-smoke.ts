import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresAssessmentTypeRepository } from '../src/repositories/postgres-assessment-type-repository';
import { PostgresRoleRepository } from '../src/repositories/postgres-role-repository';
import {
  assessmentTypes,
  roles,
} from '../src/schema/postgres-schema';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL wajib tersedia.');
}

const suffix = randomUUID().replaceAll('-', '');

const roleId = `smoke_role_${suffix}`;
const roleCode = `SMOKE_ROLE_${suffix}`;

const assessmentTypeId = `smoke_assessment_${suffix}`;
const assessmentTypeCode = `SMOKE_ASSESSMENT_${suffix}`;

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-read-repository-smoke',
});

const db = createPostgresDatabase(pool);

const roleRepository = new PostgresRoleRepository(db);
const assessmentTypeRepository =
  new PostgresAssessmentTypeRepository(db);

try {
  await db.insert(roles).values({
    id: roleId,
    code: roleCode,
    name: 'Smoke Test Role',
  });

  await db.insert(assessmentTypes).values({
    id: assessmentTypeId,
    code: assessmentTypeCode,
    name: 'Smoke Test Assessment',
    isSelf: true,
  });

  const roleRows = await roleRepository.list();
  const assessmentTypeRows =
    await assessmentTypeRepository.list();

  const role = roleRows.find(
    (row) => row.id === roleId,
  );

  if (!role || role.code !== roleCode) {
    throw new Error(
      'PostgresRoleRepository tidak mengembalikan data yang diharapkan.',
    );
  }

  const assessmentType = assessmentTypeRows.find(
    (row) => row.id === assessmentTypeId,
  );

  if (
    !assessmentType ||
    assessmentType.code !== assessmentTypeCode ||
    assessmentType.isSelf !== true
  ) {
    throw new Error(
      'PostgresAssessmentTypeRepository tidak mengembalikan data yang diharapkan.',
    );
  }

  console.log(`Role            : ${role.code}`);
  console.log(
    `Assessment type : ${assessmentType.code}`,
  );
  console.log(
    `isSelf          : ${assessmentType.isSelf}`,
  );
  console.log(
    'PostgreSQL read repositories berhasil.',
  );
} finally {
  await db
    .delete(assessmentTypes)
    .where(eq(assessmentTypes.id, assessmentTypeId));

  await db
    .delete(roles)
    .where(eq(roles.id, roleId));

  await closePostgresPool(pool);
}
