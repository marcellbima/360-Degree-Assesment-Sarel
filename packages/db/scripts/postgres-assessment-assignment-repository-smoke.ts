import { randomUUID } from 'node:crypto';

import type { PublicFormDefinition } from '@sarel/core';
import { count, eq, inArray } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresAssessmentAssignmentRepository } from '../src/repositories/postgres-assessment-assignment-repository';
import {
  assessmentAssignmentGroups,
  assessmentAssignments,
  assessmentTypes,
  evaluatorRelations,
  organizations,
  programParticipants,
  programs,
  publicForms,
  publicFormVersions,
  users,
} from '../src/schema/postgres-schema';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL wajib tersedia.');
}

const suffix = randomUUID().replaceAll('-', '');

const actorId = `smoke_assignment_actor_${suffix}`;

const actorUserId = `SMOKE_ASG_ACTOR_${suffix}`;

const organizationId = `smoke_assignment_org_${suffix}`;

const organizationCode = `SMK_ASG_ORG_${suffix}`;

const programId = `smoke_assignment_program_${suffix}`;

const programCode = `SMK_ASG_PROGRAM_${suffix}`;

const formId = `smoke_assignment_form_${suffix}`;

const formSlug = `smoke-assignment-form-${suffix}`;

const formVersionId = `smoke_assignment_version_${suffix}`;

const participantUserIds = [
  `smoke_assignment_user_1_${suffix}`,
  `smoke_assignment_user_2_${suffix}`,
  `smoke_assignment_user_3_${suffix}`,
];

const participantLoginIds = [
  `SMOKE_ASG_USER_1_${suffix}`,
  `SMOKE_ASG_USER_2_${suffix}`,
  `SMOKE_ASG_USER_3_${suffix}`,
];

const participantIds = [
  `smoke_assignment_participant_1_${suffix}`,
  `smoke_assignment_participant_2_${suffix}`,
  `smoke_assignment_participant_3_${suffix}`,
];

const relationId = `smoke_assignment_relation_${suffix}`;

const selfGroupId = `smoke_assignment_group_self_${suffix}`;

const duplicateSelfGroupId = `smoke_assignment_group_duplicate_${suffix}`;

const otherGroupId = `smoke_assignment_group_other_${suffix}`;

const groupIds = [selfGroupId, duplicateSelfGroupId, otherGroupId];

const createdAt = '2026-07-20T04:00:00.000Z';

const definition: PublicFormDefinition = {
  title: 'Smoke Assignment Form',
  description: 'Form sementara untuk pengujian Assignment.',
  sections: [],
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const pool = createPostgresPool({
  connectionString,
  max: 4,
  applicationName: 'sarel-assessment-assignment-smoke',
});

const db = createPostgresDatabase(pool);

const repository = new PostgresAssessmentAssignmentRepository(db);

let runError: unknown = null;

let cleanupError: unknown = null;

try {
  const typeRows = await db
    .select({
      id: assessmentTypes.id,
      code: assessmentTypes.code,
      isSelf: assessmentTypes.isSelf,
    })
    .from(assessmentTypes)
    .where(inArray(assessmentTypes.code, ['SELF', 'SUPERIOR']));

  const selfType = typeRows.find((row) => row.code === 'SELF');

  const superiorType = typeRows.find((row) => row.code === 'SUPERIOR');

  assert(selfType !== undefined, 'Assessment type SELF belum tersedia.');

  assert(superiorType !== undefined, 'Assessment type SUPERIOR belum tersedia.');

  assert(selfType.isSelf === true, 'Konfigurasi SELF tidak valid.');

  assert(superiorType.isSelf === false, 'Konfigurasi SUPERIOR tidak valid.');

  await db.insert(users).values([
    {
      id: actorId,
      userId: actorUserId,
      fullName: 'Smoke Assignment Actor',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
    {
      id: participantUserIds[0],
      userId: participantLoginIds[0],
      fullName: 'Smoke Participant 1',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
    {
      id: participantUserIds[1],
      userId: participantLoginIds[1],
      fullName: 'Smoke Participant 2',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
    {
      id: participantUserIds[2],
      userId: participantLoginIds[2],
      fullName: 'Smoke Participant 3',
      passwordHash: 'smoke-password-hash',
      status: 'ACTIVE',
    },
  ]);

  await db.insert(organizations).values({
    id: organizationId,
    code: organizationCode,
    name: 'Smoke Assignment Organization',
    status: 'ACTIVE',
    createdAt,
    updatedAt: createdAt,
  });

  await db.insert(programs).values({
    id: programId,
    code: programCode,
    name: 'Smoke Assignment Program',
    description: 'Program sementara untuk pengujian Assignment.',
    year: 2026,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    organizationId,
    status: 'ACTIVE',
    createdAt,
    updatedAt: createdAt,
    createdBy: actorId,
  });

  await db.insert(publicForms).values({
    id: formId,
    slug: formSlug,
    title: 'Smoke Assignment Form',
    description: 'Form sementara untuk pengujian Assignment.',
    status: 'PUBLISHED',
    draftDefinition: definition,
    publishedDefinition: definition,
    opensAt: null,
    closesAt: null,
    publishedAt: createdAt,
    googleSheetsEnabled: false,
    googleSheetsWebhookUrl: null,
    createdBy: actorId,
    createdAt,
    updatedAt: createdAt,
  });

  await db.insert(publicFormVersions).values({
    id: formVersionId,
    publicFormId: formId,
    versionNumber: 1,
    definition,
    publishedAt: createdAt,
    createdBy: actorId,
    createdAt,
  });

  await db.insert(programParticipants).values([
    {
      id: participantIds[0],
      userId: participantUserIds[0],
      programId,
      batchId: null,
      organizationId,
      employeeId: null,
      position: null,
      unit: null,
      status: 'ACTIVE',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: participantIds[1],
      userId: participantUserIds[1],
      programId,
      batchId: null,
      organizationId,
      employeeId: null,
      position: null,
      unit: null,
      status: 'ACTIVE',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: participantIds[2],
      userId: participantUserIds[2],
      programId,
      batchId: null,
      organizationId,
      employeeId: null,
      position: null,
      unit: null,
      status: 'ACTIVE',
      createdAt,
      updatedAt: createdAt,
    },
  ]);

  await db.insert(evaluatorRelations).values({
    id: relationId,
    programParticipantId: participantIds[0],
    evaluatorUserId: participantUserIds[1],
    assessmentTypeId: superiorType.id,
    status: 'ACTIVE',
    assignedAt: createdAt,
    assignedBy: actorId,
    createdAt,
    updatedAt: createdAt,
  });

  const versionRef = await repository.findPublicFormVersionById(formVersionId);

  assert(versionRef !== null, 'Versi form tidak ditemukan oleh repository.');

  assert(
    versionRef.publicFormId === formId && versionRef.versionNumber === 1,
    'Referensi versi form tidak sesuai.',
  );

  const selfResult = await repository.createGroup({
    group: {
      id: selfGroupId,
      programId,
      publicFormVersionId: formVersionId,
      assessmentTypeId: selfType.id,
      name: 'Smoke SELF',
      selectionMode: 'PARTICIPANTS',
      status: 'ACTIVE',
      availableFrom: null,
      dueAt: null,
      createdBy: actorId,
      createdAt,
      updatedAt: createdAt,
    },
    selection: {
      mode: 'PARTICIPANTS',
      participantIds: [participantIds[0], participantIds[1]],
    },
    assessmentTypeCode: 'SELF',
    isSelf: true,
    assignmentStatus: 'AVAILABLE',
    scope: {
      kind: 'all',
    },
  });

  assert(selfResult !== null, 'Assignment SELF tidak berhasil dibuat.');

  assert(selfResult.selectedParticipantCount === 2, 'Jumlah participant SELF tidak sesuai.');

  assert(
    selfResult.candidateAssignmentCount === 2 && selfResult.createdAssignmentCount === 2,
    'Jumlah Assignment SELF tidak sesuai.',
  );

  const selfAssignments = await db
    .select({
      participantId: assessmentAssignments.programParticipantId,
      evaluatorUserId: assessmentAssignments.evaluatorUserId,
      evaluatorRelationId: assessmentAssignments.evaluatorRelationId,
      status: assessmentAssignments.status,
    })
    .from(assessmentAssignments)
    .where(eq(assessmentAssignments.assignmentGroupId, selfGroupId));

  assert(selfAssignments.length === 2, 'Database tidak menyimpan dua Assignment SELF.');

  const participantUserById = new Map([
    [participantIds[0], participantUserIds[0]],
    [participantIds[1], participantUserIds[1]],
  ]);

  for (const assignment of selfAssignments) {
    assert(
      assignment.evaluatorUserId === participantUserById.get(assignment.participantId),
      'Evaluator SELF bukan user milik participant.',
    );

    assert(assignment.evaluatorRelationId === null, 'Assignment SELF memiliki evaluator relation.');

    assert(assignment.status === 'AVAILABLE', 'Status awal Assignment SELF tidak sesuai.');
  }

  const duplicateResult = await repository.createGroup({
    group: {
      id: duplicateSelfGroupId,
      programId,
      publicFormVersionId: formVersionId,
      assessmentTypeId: selfType.id,
      name: 'Smoke Duplicate SELF',
      selectionMode: 'PARTICIPANTS',
      status: 'ACTIVE',
      availableFrom: null,
      dueAt: null,
      createdBy: actorId,
      createdAt,
      updatedAt: createdAt,
    },
    selection: {
      mode: 'PARTICIPANTS',
      participantIds: [participantIds[0], participantIds[1]],
    },
    assessmentTypeCode: 'SELF',
    isSelf: true,
    assignmentStatus: 'AVAILABLE',
    scope: {
      kind: 'all',
    },
  });

  assert(duplicateResult === null, 'Duplikat Assignment aktif masih berhasil dibuat.');

  const [remainingDuplicateGroup] = await db
    .select({
      value: count(),
    })
    .from(assessmentAssignmentGroups)
    .where(eq(assessmentAssignmentGroups.id, duplicateSelfGroupId));

  assert(
    Number(remainingDuplicateGroup?.value ?? 0) === 0,
    'Group duplikat tetap tersimpan tanpa Assignment.',
  );

  const otherResult = await repository.createGroup({
    group: {
      id: otherGroupId,
      programId,
      publicFormVersionId: formVersionId,
      assessmentTypeId: superiorType.id,
      name: 'Smoke SUPERIOR',
      selectionMode: 'PARTICIPANTS',
      status: 'ACTIVE',
      availableFrom: null,
      dueAt: null,
      createdBy: actorId,
      createdAt,
      updatedAt: createdAt,
    },
    selection: {
      mode: 'PARTICIPANTS',
      participantIds: [participantIds[0], participantIds[2]],
    },
    assessmentTypeCode: 'SUPERIOR',
    isSelf: false,
    assignmentStatus: 'AVAILABLE',
    scope: {
      kind: 'all',
    },
  });

  assert(otherResult !== null, 'Assignment OTHER tidak berhasil dibuat.');

  assert(otherResult.selectedParticipantCount === 2, 'Jumlah participant OTHER tidak sesuai.');

  assert(
    otherResult.candidateAssignmentCount === 1 && otherResult.createdAssignmentCount === 1,
    'Jumlah Assignment OTHER tidak sesuai.',
  );

  assert(
    otherResult.skippedNoRelationCount === 1,
    'Participant tanpa relation tidak dihitung dengan benar.',
  );

  const otherAssignments = await db
    .select({
      participantId: assessmentAssignments.programParticipantId,
      evaluatorUserId: assessmentAssignments.evaluatorUserId,
      evaluatorRelationId: assessmentAssignments.evaluatorRelationId,
    })
    .from(assessmentAssignments)
    .where(eq(assessmentAssignments.assignmentGroupId, otherGroupId));

  assert(otherAssignments.length === 1, 'Database tidak menyimpan tepat satu Assignment OTHER.');

  assert(
    otherAssignments[0]?.participantId === participantIds[0],
    'Subject Assignment OTHER tidak sesuai.',
  );

  assert(
    otherAssignments[0]?.evaluatorUserId === participantUserIds[1],
    'Evaluator Assignment OTHER tidak sesuai.',
  );

  assert(
    otherAssignments[0]?.evaluatorRelationId === relationId,
    'Evaluator relation tidak tersimpan pada Assignment OTHER.',
  );

  const [storedOtherGroup] = await db
    .select({
      selectionSummary: assessmentAssignmentGroups.selectionSummary,
    })
    .from(assessmentAssignmentGroups)
    .where(eq(assessmentAssignmentGroups.id, otherGroupId));

  const selectionSummary = storedOtherGroup?.selectionSummary as
    | {
        selectedParticipantCount?: number;
        candidateAssignmentCount?: number;
        skippedNoRelationCount?: number;
      }
    | undefined;

  assert(
    selectionSummary?.selectedParticipantCount === 2 &&
      selectionSummary.candidateAssignmentCount === 1 &&
      selectionSummary.skippedNoRelationCount === 1,
    'Selection summary Assignment Group tidak sesuai.',
  );

  console.log('Form version lookup : OK');

  console.log('SELF assignments    : 2');

  console.log('Duplicate SELF      : BLOCKED');

  console.log('OTHER assignments   : 1');

  console.log('No relation skipped : 1');
} catch (error) {
  runError = error;
} finally {
  try {
    await db
      .delete(assessmentAssignments)
      .where(inArray(assessmentAssignments.assignmentGroupId, groupIds));

    await db
      .delete(assessmentAssignmentGroups)
      .where(inArray(assessmentAssignmentGroups.id, groupIds));

    await db.delete(evaluatorRelations).where(eq(evaluatorRelations.id, relationId));

    await db.delete(programParticipants).where(inArray(programParticipants.id, participantIds));

    await db.delete(publicFormVersions).where(eq(publicFormVersions.id, formVersionId));

    await db.delete(publicForms).where(eq(publicForms.id, formId));

    await db.delete(programs).where(eq(programs.id, programId));

    await db.delete(organizations).where(eq(organizations.id, organizationId));

    await db.delete(users).where(inArray(users.id, [actorId, ...participantUserIds]));

    const [remainingGroups] = await db
      .select({
        value: count(),
      })
      .from(assessmentAssignmentGroups)
      .where(inArray(assessmentAssignmentGroups.id, groupIds));

    const [remainingAssignments] = await db
      .select({
        value: count(),
      })
      .from(assessmentAssignments)
      .where(inArray(assessmentAssignments.assignmentGroupId, groupIds));

    const [remainingParticipants] = await db
      .select({
        value: count(),
      })
      .from(programParticipants)
      .where(inArray(programParticipants.id, participantIds));

    const [remainingUsers] = await db
      .select({
        value: count(),
      })
      .from(users)
      .where(inArray(users.id, [actorId, ...participantUserIds]));

    assert(Number(remainingGroups?.value ?? 0) === 0, 'Cleanup Assignment Group tidak tuntas.');

    assert(Number(remainingAssignments?.value ?? 0) === 0, 'Cleanup Assignment tidak tuntas.');

    assert(
      Number(remainingParticipants?.value ?? 0) === 0,
      'Cleanup participant smoke tidak tuntas.',
    );

    assert(Number(remainingUsers?.value ?? 0) === 0, 'Cleanup user smoke tidak tuntas.');

    console.log('Cleanup             : OK');
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

console.log('PostgresAssessmentAssignmentRepository smoke test berhasil.');
