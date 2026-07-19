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
import { PostgresImportLookupRepository } from '../src/repositories/postgres-import-lookup-repository';
import {
  assessmentTypes,
  batches,
  evaluatorRelations,
  programParticipants,
  programs,
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

const subjectUserId =
  `smoke_subject_user_${suffix}`;
const subjectUserCode =
  `SMOKE_SUBJECT_${suffix}`;

const evaluatorUserId =
  `smoke_evaluator_user_${suffix}`;
const evaluatorUserCode =
  `SMOKE_EVALUATOR_${suffix}`;

const programId =
  `smoke_program_${suffix}`;
const otherProgramId =
  `smoke_other_program_${suffix}`;

const activeBatchId =
  `smoke_active_batch_${suffix}`;
const inactiveBatchId =
  `smoke_inactive_batch_${suffix}`;
const otherProgramBatchId =
  `smoke_other_batch_${suffix}`;

const sharedBatchCode =
  `SMOKE_BATCH_${suffix}`;
const inactiveBatchCode =
  `SMOKE_INACTIVE_BATCH_${suffix}`;

const participantId =
  `smoke_participant_${suffix}`;

const assessmentTypeId =
  `smoke_assessment_type_${suffix}`;
const assessmentTypeCode =
  `SMOKE_TYPE_${suffix}`;

const relationId =
  `smoke_relation_${suffix}`;

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-import-lookup-smoke',
});

const db = createPostgresDatabase(pool);

const repository =
  new PostgresImportLookupRepository(db);

try {
  await db.insert(users).values([
    {
      id: subjectUserId,
      userId: subjectUserCode,
      fullName: 'Smoke Subject User',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
    {
      id: evaluatorUserId,
      userId: evaluatorUserCode,
      fullName: 'Smoke Evaluator User',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
  ]);

  await db.insert(programs).values([
    {
      id: programId,
      code: `SMOKE_PROGRAM_${suffix}`,
      name: 'Smoke Test Program',
      status: 'ACTIVE',
    },
    {
      id: otherProgramId,
      code: `SMOKE_OTHER_PROGRAM_${suffix}`,
      name: 'Smoke Test Other Program',
      status: 'ACTIVE',
    },
  ]);

  await db.insert(batches).values([
    {
      id: activeBatchId,
      programId,
      code: sharedBatchCode,
      name: 'Smoke Active Batch',
      status: 'ACTIVE',
    },
    {
      id: inactiveBatchId,
      programId,
      code: inactiveBatchCode,
      name: 'Smoke Inactive Batch',
      status: 'ARCHIVED',
    },
    {
      id: otherProgramBatchId,
      programId: otherProgramId,
      code: sharedBatchCode,
      name: 'Smoke Other Program Batch',
      status: 'ACTIVE',
    },
  ]);

  await db.insert(assessmentTypes).values({
    id: assessmentTypeId,
    code: assessmentTypeCode,
    name: 'Smoke Assessment Type',
    isSelf: false,
    requiresEvaluatorRelation: true,
    status: 'ACTIVE',
  });

  await db.insert(programParticipants).values({
    id: participantId,
    userId: subjectUserId,
    programId,
    batchId: activeBatchId,
    status: 'ACTIVE',
  });

  await db.insert(evaluatorRelations).values({
    id: relationId,
    programParticipantId: participantId,
    evaluatorUserId,
    assessmentTypeId,
    status: 'ACTIVE',
  });

  const emptyUsers =
    await repository.findUsersByCodes([]);

  if (emptyUsers.size !== 0) {
    throw new Error(
      'findUsersByCodes([]) seharusnya menghasilkan Map kosong.',
    );
  }

  const usersByCode =
    await repository.findUsersByCodes([
      subjectUserCode,
      evaluatorUserCode,
      `MISSING_${suffix}`,
    ]);

  if (
    usersByCode.size !== 2 ||
    usersByCode.get(subjectUserCode)?.id !==
      subjectUserId ||
    usersByCode.get(evaluatorUserCode)?.id !==
      evaluatorUserId
  ) {
    throw new Error(
      'findUsersByCodes() tidak mengembalikan user yang diharapkan.',
    );
  }

  const batchCodes =
    await repository.findBatchCodes(
      programId,
      [
        sharedBatchCode,
        inactiveBatchCode,
      ],
    );

  if (
    batchCodes.size !== 1 ||
    batchCodes.get(sharedBatchCode) !==
      activeBatchId ||
    batchCodes.has(inactiveBatchCode)
  ) {
    throw new Error(
      'findBatchCodes() tidak menerapkan filter program dan status aktif dengan benar.',
    );
  }

  const activeParticipantUserIds =
    await repository.findActiveParticipantUserIds(
      programId,
    );

  if (
    activeParticipantUserIds.size !== 1 ||
    !activeParticipantUserIds.has(
      subjectUserId,
    )
  ) {
    throw new Error(
      'findActiveParticipantUserIds() tidak mengembalikan participant aktif yang diharapkan.',
    );
  }

  const participantsByUserCode =
    await repository.findActiveParticipantsByUserCodes(
      programId,
      [
        subjectUserCode,
        evaluatorUserCode,
      ],
    );

  const participant =
    participantsByUserCode.get(
      subjectUserCode,
    );

  if (
    participantsByUserCode.size !== 1 ||
    !participant ||
    participant.participantId !==
      participantId ||
    participant.userId !== subjectUserId ||
    participant.batchId !== activeBatchId ||
    participant.organizationId !== null
  ) {
    throw new Error(
      'findActiveParticipantsByUserCodes() tidak mengembalikan participant yang diharapkan.',
    );
  }

  const emptyParticipants =
    await repository.findActiveParticipantsByUserCodes(
      programId,
      [],
    );

  if (emptyParticipants.size !== 0) {
    throw new Error(
      'findActiveParticipantsByUserCodes([]) seharusnya menghasilkan Map kosong.',
    );
  }

  const relationKeys =
    await repository.findActiveRelationKeys(
      programId,
    );

  const expectedRelationKey =
    `${participantId}|${evaluatorUserId}|${assessmentTypeId}`;

  if (
    relationKeys.size !== 1 ||
    !relationKeys.has(expectedRelationKey)
  ) {
    throw new Error(
      'findActiveRelationKeys() tidak menghasilkan relation key yang diharapkan.',
    );
  }

  console.log(
    `Users              : ${usersByCode.size}`,
  );
  console.log(
    `Active batch       : ${batchCodes.get(sharedBatchCode)}`,
  );
  console.log(
    `Active participant : ${participant.participantId}`,
  );
  console.log(
    `Relation key       : ${expectedRelationKey}`,
  );
  console.log(
    'PostgreSQL import lookup repository berhasil.',
  );
} finally {
  try {
    await db
      .delete(evaluatorRelations)
      .where(
        eq(
          evaluatorRelations.id,
          relationId,
        ),
      );

    await db
      .delete(programParticipants)
      .where(
        eq(
          programParticipants.id,
          participantId,
        ),
      );

    await db
      .delete(assessmentTypes)
      .where(
        eq(
          assessmentTypes.id,
          assessmentTypeId,
        ),
      );

    await db
      .delete(batches)
      .where(
        inArray(batches.id, [
          activeBatchId,
          inactiveBatchId,
          otherProgramBatchId,
        ]),
      );

    await db
      .delete(programs)
      .where(
        inArray(programs.id, [
          programId,
          otherProgramId,
        ]),
      );

    await db
      .delete(users)
      .where(
        inArray(users.id, [
          subjectUserId,
          evaluatorUserId,
        ]),
      );
  } finally {
    await closePostgresPool(pool);
  }
}
