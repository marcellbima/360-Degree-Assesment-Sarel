import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Skema awal (Phase 2). Mengikuti docs/ERD_DRAFT.md.
// Catatan: partial unique index untuk assignment aktif ditulis pada
// migrations/sqlite/0001_init.sql karena memerlukan klausa WHERE.

const now = sql`CURRENT_TIMESTAMP`;

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    npk: text('npk'),
    fullName: text('full_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    email: text('email'),
    phone: text('phone'),
    position: text('position'),
    unit: text('unit'),
    division: text('division'),
    organizationId: text('organization_id').references(() => organizations.id),
    status: text('status').notNull().default('ACTIVE'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    uxUserId: uniqueIndex('ux_users_user_id').on(sql`lower(${t.userId})`),
    ixNpk: index('ix_users_npk').on(t.npk),
    ixStatus: index('ix_users_status').on(t.status),
  }),
);

export const roles = pgTable(
  'roles',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_roles_code').on(t.code),
  }),
);

export const permissions = pgTable(
  'permissions',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    description: text('description'),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_permissions_code').on(t.code),
  }),
);

export const userRoles = pgTable(
  'user_roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id),
  },
  (t) => ({
    uxUserRole: uniqueIndex('ux_user_roles_user_role').on(t.userId, t.roleId),
  }),
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id),
  },
  (t) => ({
    uxRolePerm: uniqueIndex('ux_role_permissions_role_perm').on(t.roleId, t.permissionId),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
  },
  (t) => ({
    uxToken: uniqueIndex('ux_sessions_token_hash').on(t.tokenHash),
    ixUser: index('ix_sessions_user').on(t.userId),
    ixExpiresAt: index('ix_sessions_expires_at').on(t.expiresAt),
  }),
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id),
    userIdInput: text('user_id_input'),
    success: boolean('success').notNull().default(false),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixCreatedAt: index('ix_login_attempts_created_at').on(t.createdAt),
    ixUser: index('ix_login_attempts_user').on(t.userId),
    ixIp: index('ix_login_attempts_ip').on(t.ipAddress),
    ixUserInput: index('ix_login_attempts_user_input').on(t.userIdInput),
  }),
);

export const organizations = pgTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_organizations_code').on(t.code),
    ixStatus: index('ix_organizations_status').on(t.status),
  }),
);

export const programs = pgTable(
  'programs',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    year: integer('year'),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    organizationId: text('organization_id').references(() => organizations.id),
    status: text('status').notNull().default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_programs_code').on(t.code),
    ixStatus: index('ix_programs_status').on(t.status),
    ixOrganization: index('ix_programs_organization').on(t.organizationId),
  }),
);

export const batches = pgTable(
  'batches',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull().default(0),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    status: text('status').notNull().default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    uxProgramCode: uniqueIndex('ux_batches_program_code').on(t.programId, t.code),
    ixProgram: index('ix_batches_program').on(t.programId),
    ixStatus: index('ix_batches_status').on(t.status),
    ixCode: index('ix_batches_code').on(t.code),
  }),
);

export const programParticipants = pgTable(
  'program_participants',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id),
    batchId: text('batch_id').references(() => batches.id),
    organizationId: text('organization_id').references(() => organizations.id),
    employeeId: text('employee_id'),
    position: text('position'),
    unit: text('unit'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxEnrollment: uniqueIndex('ux_program_participants_enrollment').on(
      t.programId,
      t.batchId,
      t.userId,
    ),
    ixUser: index('ix_program_participants_user').on(t.userId),
    ixProgram: index('ix_program_participants_program').on(t.programId),
    ixBatch: index('ix_program_participants_batch').on(t.batchId),
    ixStatus: index('ix_program_participants_status').on(t.status),
    uxActiveUser: uniqueIndex('ux_program_participants_active_user')
      .on(t.programId, t.userId)
      .where(sql`status = 'ACTIVE'`),
  }),
);

export const adminScopes = pgTable(
  'admin_scopes',
  {
    id: text('id').primaryKey(),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => users.id),
    programId: text('program_id').references(() => programs.id),
    batchId: text('batch_id').references(() => batches.id),
    organizationId: text('organization_id').references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    ixAdmin: index('ix_admin_scopes_admin').on(t.adminUserId),
    ckTarget: check(
      'ck_admin_scopes_target',
      sql`${t.programId} IS NOT NULL OR ${t.batchId} IS NOT NULL OR ${t.organizationId} IS NOT NULL`,
    ),
  }),
);

export const assessmentTypes = pgTable(
  'assessment_types',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color'),
    icon: text('icon'),
    orderIndex: integer('order_index').notNull().default(0),
    isSelf: boolean('is_self').notNull().default(false),
    requiresEvaluatorRelation: boolean('requires_evaluator_relation').notNull().default(true),
    defaultTarget: integer('default_target').notNull().default(0),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_assessment_types_code').on(t.code),
  }),
);

export const participantAssessmentTargets = pgTable(
  'participant_assessment_targets',
  {
    id: text('id').primaryKey(),
    programParticipantId: text('program_participant_id')
      .notNull()
      .references(() => programParticipants.id),
    assessmentTypeId: text('assessment_type_id')
      .notNull()
      .references(() => assessmentTypes.id),
    targetCount: integer('target_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxTarget: uniqueIndex('ux_participant_targets').on(t.programParticipantId, t.assessmentTypeId),
    ixType: index('ix_participant_targets_type').on(t.assessmentTypeId),
  }),
);

export const evaluatorRelations = pgTable(
  'evaluator_relations',
  {
    id: text('id').primaryKey(),
    programParticipantId: text('program_participant_id')
      .notNull()
      .references(() => programParticipants.id),
    evaluatorUserId: text('evaluator_user_id')
      .notNull()
      .references(() => users.id),
    assessmentTypeId: text('assessment_type_id')
      .notNull()
      .references(() => assessmentTypes.id),
    status: text('status').notNull().default('ACTIVE'),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'string' }),
    assignedBy: text('assigned_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxRelation: uniqueIndex('ux_evaluator_relations').on(
      t.programParticipantId,
      t.evaluatorUserId,
      t.assessmentTypeId,
    ),
    ixParticipant: index('ix_evaluator_relations_participant').on(t.programParticipantId),
    ixEvaluator: index('ix_evaluator_relations_evaluator').on(t.evaluatorUserId),
    ixType: index('ix_evaluator_relations_type').on(t.assessmentTypeId),
    ixStatus: index('ix_evaluator_relations_status').on(t.status),
  }),
);

export const publicForms = pgTable(
  'public_forms',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('DRAFT'),

    draftDefinition: jsonb('draft_definition').notNull(),

    publishedDefinition: jsonb('published_definition'),

    opensAt: timestamp('opens_at', {
      withTimezone: true,
      mode: 'string',
    }),

    closesAt: timestamp('closes_at', {
      withTimezone: true,
      mode: 'string',
    }),

    publishedAt: timestamp('published_at', {
      withTimezone: true,
      mode: 'string',
    }),

    googleSheetsEnabled: boolean('google_sheets_enabled').notNull().default(false),

    googleSheetsWebhookUrl: text('google_sheets_webhook_url'),

    googleSheetId: text('google_sheet_id'),

    googleSheetUrl: text('google_sheet_url'),

    googleSheetStatus: text('google_sheet_status').notNull().default('NOT_CONNECTED'),

    googleSheetConnectedAt: timestamp('google_sheet_connected_at', {
      withTimezone: true,
      mode: 'string',
    }),

    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),
  },
  (table) => ({
    uxSlug: uniqueIndex('ux_public_forms_slug').on(table.slug),

    ixStatus: index('ix_public_forms_status').on(table.status),

    ixSchedule: index('ix_public_forms_schedule').on(table.opensAt, table.closesAt),
  }),
);

export const publicFormVersions = pgTable(
  'public_form_versions',
  {
    id: text('id').primaryKey(),
    publicFormId: text('public_form_id')
      .notNull()
      .references(() => publicForms.id),
    versionNumber: integer('version_number').notNull(),
    definition: jsonb('definition').notNull(),
    publishedAt: timestamp('published_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxFormVersion: uniqueIndex('ux_public_form_versions_form_version').on(
      t.publicFormId,
      t.versionNumber,
    ),
    ixForm: index('ix_public_form_versions_form').on(t.publicFormId),
    ixPublishedAt: index('ix_public_form_versions_published_at').on(t.publishedAt),
  }),
);

export const assessmentAssignmentGroups = pgTable(
  'assessment_assignment_groups',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id),
    publicFormVersionId: text('public_form_version_id')
      .notNull()
      .references(() => publicFormVersions.id),
    assessmentTypeId: text('assessment_type_id')
      .notNull()
      .references(() => assessmentTypes.id),
    name: text('name').notNull(),
    selectionMode: text('selection_mode').notNull(),
    selectionSummary: jsonb('selection_summary')
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text('status').notNull().default('ACTIVE'),
    availableFrom: timestamp('available_from', {
      withTimezone: true,
      mode: 'string',
    }),
    dueAt: timestamp('due_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixProgram: index('ix_assignment_groups_program').on(t.programId),
    ixFormVersion: index('ix_assignment_groups_form_version').on(t.publicFormVersionId),
    ixAssessmentType: index('ix_assignment_groups_assessment_type').on(t.assessmentTypeId),
    ixStatus: index('ix_assignment_groups_status').on(t.status),
    ckSchedule: check(
      'ck_assignment_groups_schedule',
      sql`${t.dueAt} IS NULL OR ${t.availableFrom} IS NULL OR ${t.dueAt} > ${t.availableFrom}`,
    ),
  }),
);

export const questionnaires = pgTable(
  'questionnaires',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_questionnaires_code').on(t.code),
  }),
);

export const questionnaireVersions = pgTable(
  'questionnaire_versions',
  {
    id: text('id').primaryKey(),
    questionnaireId: text('questionnaire_id')
      .notNull()
      .references(() => questionnaires.id),
    versionNumber: integer('version_number').notNull(),
    status: text('status').notNull().default('DRAFT'),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxVersion: uniqueIndex('ux_questionnaire_versions').on(t.questionnaireId, t.versionNumber),
  }),
);

export const questions = pgTable(
  'questions',
  {
    id: text('id').primaryKey(),
    questionnaireVersionId: text('questionnaire_version_id')
      .notNull()
      .references(() => questionnaireVersions.id),
    code: text('code'),
    text: text('text').notNull(),
    questionType: text('question_type').notNull(),
    weight: integer('weight').notNull().default(1),
    category: text('category'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixVersion: index('ix_questions_version').on(t.questionnaireVersionId),
  }),
);

export const questionOptions = pgTable(
  'question_options',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id),
    label: text('label').notNull(),
    value: text('value').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => ({
    ixQuestion: index('ix_question_options_question').on(t.questionId),
  }),
);

export const assessmentAssignments = pgTable(
  'assessment_assignments',
  {
    id: text('id').primaryKey(),
    assignmentGroupId: text('assignment_group_id').references(() => assessmentAssignmentGroups.id),
    programParticipantId: text('program_participant_id').references(() => programParticipants.id),
    evaluatorUserId: text('evaluator_user_id').references(() => users.id),
    assessmentTypeId: text('assessment_type_id').references(() => assessmentTypes.id),
    publicFormVersionId: text('public_form_version_id').references(() => publicFormVersions.id),
    evaluatorRelationId: text('evaluator_relation_id').references(() => evaluatorRelations.id),
    questionnaireVersionId: text('questionnaire_version_id').references(
      () => questionnaireVersions.id,
    ),
    status: text('status').notNull().default('ASSIGNED'),
    assignedAt: timestamp('assigned_at', {
      withTimezone: true,
      mode: 'string',
    }),
    availableFrom: timestamp('available_from', {
      withTimezone: true,
      mode: 'string',
    }),
    dueAt: timestamp('due_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdBy: text('created_by').references(() => users.id),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixGroup: index('ix_assignments_group').on(t.assignmentGroupId),
    ixParticipant: index('ix_assignments_participant').on(t.programParticipantId),
    ixEvaluator: index('ix_assignments_evaluator').on(t.evaluatorUserId),
    ixAssessmentType: index('ix_assignments_assessment_type').on(t.assessmentTypeId),
    ixFormVersion: index('ix_assignments_form_version').on(t.publicFormVersionId),
    ixRelation: index('ix_assignments_relation').on(t.evaluatorRelationId),
    ixStatus: index('ix_assignments_status').on(t.status),
    uxActiveAssignment: uniqueIndex('ux_active_assignment')
      .on(t.evaluatorRelationId, t.questionnaireVersionId)
      .where(sql`${t.status} IN ('ASSIGNED', 'AVAILABLE', 'IN_PROGRESS')`),
    uxActiveAssignmentV2: uniqueIndex('ux_active_assignment_v2')
      .on(t.programParticipantId, t.evaluatorUserId, t.assessmentTypeId, t.publicFormVersionId)
      .where(
        sql`${t.status} IN ('ASSIGNED', 'AVAILABLE', 'IN_PROGRESS') AND ${t.programParticipantId} IS NOT NULL AND ${t.evaluatorUserId} IS NOT NULL AND ${t.assessmentTypeId} IS NOT NULL AND ${t.publicFormVersionId} IS NOT NULL`,
      ),
  }),
);

export const attempts = pgTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id')
      .notNull()
      .references(() => assessmentAssignments.id),
    status: text('status').notNull().default('NOT_STARTED'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true, mode: 'string' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'string' }),
    version: integer('version').notNull().default(0),
    score: integer('score'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixAssignment: index('ix_attempts_assignment').on(t.assignmentId),
    ixStatus: index('ix_attempts_status').on(t.status),
  }),
);

export const answers = pgTable(
  'answers',
  {
    id: text('id').primaryKey(),
    attemptId: text('attempt_id')
      .notNull()
      .references(() => attempts.id),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id),
    value: text('value'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxAnswer: uniqueIndex('ux_answers_attempt_question').on(t.attemptId, t.questionId),
    ixAttempt: index('ix_answers_attempt').on(t.attemptId),
  }),
);

export const answerOptions = pgTable(
  'answer_options',
  {
    id: text('id').primaryKey(),
    answerId: text('answer_id')
      .notNull()
      .references(() => answers.id),
    optionId: text('option_id')
      .notNull()
      .references(() => questionOptions.id),
  },
  (t) => ({
    ixAnswer: index('ix_answer_options_answer').on(t.answerId),
  }),
);

export const quizzes = pgTable(
  'quizzes',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('DRAFT'),
    questionsPerPage: integer('questions_per_page').notNull().default(10),
    passingScore: integer('passing_score'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_quizzes_code').on(t.code),
  }),
);

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: text('id').primaryKey(),
    quizId: text('quiz_id')
      .notNull()
      .references(() => quizzes.id),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => ({
    uxQuizQuestion: uniqueIndex('ux_quiz_questions').on(t.quizId, t.questionId),
  }),
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').references(() => users.id),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    previousValue: text('previous_value'),
    newValue: text('new_value'),
    reason: text('reason'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixActor: index('ix_audit_logs_actor').on(t.actorId),
    ixCreatedAt: index('ix_audit_logs_created_at').on(t.createdAt),
  }),
);

export const importJobs = pgTable(
  'import_jobs',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    status: text('status').notNull().default('PENDING'),
    summary: text('summary'),
    createdBy: text('created_by').references(() => users.id),
    programId: text('program_id').references(() => programs.id),
    fileName: text('file_name'),
    checksum: text('checksum'),
    totalRows: integer('total_rows').notNull().default(0),
    validRows: integer('valid_rows').notNull().default(0),
    skippedRows: integer('skipped_rows').notNull().default(0),
    errorRows: integer('error_rows').notNull().default(0),
    errorSummary: text('error_summary'),
    committedAt: timestamp('committed_at', { withTimezone: true, mode: 'string' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixCreatedBy: index('ix_import_jobs_created_by').on(t.createdBy),
    ixStatus: index('ix_import_jobs_status').on(t.status),
    ixCreatedAt: index('ix_import_jobs_created_at').on(t.createdAt),
  }),
);

export const importJobRows = pgTable(
  'import_job_rows',
  {
    id: text('id').primaryKey(),
    importJobId: text('import_job_id')
      .notNull()
      .references(() => importJobs.id),
    rowNumber: integer('row_number').notNull(),
    status: text('status').notNull(),
    message: text('message'),
    normalized: text('normalized'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(now),
  },
  (t) => ({
    ixJob: index('ix_import_job_rows_job').on(t.importJobId),
    uxJobRow: uniqueIndex('ux_import_job_rows_job_row').on(t.importJobId, t.rowNumber),
  }),
);

export const exportJobs = pgTable('export_jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  status: text('status').notNull().default('PENDING'),
  fileKey: text('file_key'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().default(now),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().default(now),
});

export const systemSettings = pgTable('system_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().default(now),
});

export const publicFormSubmissions = pgTable(
  'public_form_submissions',
  {
    id: text('id').primaryKey(),

    formId: text('form_id')
      .notNull()
      .references(() => publicForms.id),

    respondentName: text('respondent_name'),

    respondentEmail: text('respondent_email'),

    answers: jsonb('answers').notNull(),

    status: text('status').notNull().default('SUBMITTED'),

    sheetSyncStatus: text('sheet_sync_status').notNull().default('NOT_CONFIGURED'),

    sheetSyncAttempts: integer('sheet_sync_attempts').notNull().default(0),

    sheetSyncedAt: timestamp('sheet_synced_at', {
      withTimezone: true,
      mode: 'string',
    }),

    sheetSyncError: text('sheet_sync_error'),

    submittedAt: timestamp('submitted_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(now),
  },
  (table) => ({
    ixForm: index('ix_public_form_submissions_form').on(table.formId),

    ixSubmittedAt: index('ix_public_form_submissions_submitted_at').on(table.submittedAt),

    ixSheetSyncStatus: index('ix_public_form_submissions_sheet_sync_status').on(
      table.sheetSyncStatus,
    ),
  }),
);
