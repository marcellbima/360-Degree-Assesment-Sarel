import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Skema awal (Phase 2). Mengikuti docs/ERD_DRAFT.md.
// Catatan: partial unique index untuk assignment aktif ditulis pada
// migrations/sqlite/0001_init.sql karena memerlukan klausa WHERE.

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const users = sqliteTable(
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
    mustChangePassword: integer('must_change_password').notNull().default(0),
    lastLoginAt: text('last_login_at'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    uxUserId: uniqueIndex('ux_users_user_id').on(t.userId),
    ixNpk: index('ix_users_npk').on(t.npk),
    ixStatus: index('ix_users_status').on(t.status),
  }),
);

export const roles = sqliteTable(
  'roles',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_roles_code').on(t.code),
  }),
);

export const permissions = sqliteTable(
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

export const userRoles = sqliteTable(
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

export const rolePermissions = sqliteTable(
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

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(now),
    revokedAt: text('revoked_at'),
  },
  (t) => ({
    uxToken: uniqueIndex('ux_sessions_token_hash').on(t.tokenHash),
    ixUser: index('ix_sessions_user').on(t.userId),
    ixExpiresAt: index('ix_sessions_expires_at').on(t.expiresAt),
  }),
);

export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id),
    userIdInput: text('user_id_input'),
    success: integer('success').notNull().default(0),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => ({
    ixCreatedAt: index('ix_login_attempts_created_at').on(t.createdAt),
    ixUser: index('ix_login_attempts_user').on(t.userId),
    ixIp: index('ix_login_attempts_ip').on(t.ipAddress),
    ixUserInput: index('ix_login_attempts_user_input').on(t.userIdInput),
  }),
);

export const organizations = sqliteTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_organizations_code').on(t.code),
    ixStatus: index('ix_organizations_status').on(t.status),
  }),
);

export const programs = sqliteTable(
  'programs',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    year: integer('year'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    organizationId: text('organization_id').references(() => organizations.id),
    status: text('status').notNull().default('DRAFT'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_programs_code').on(t.code),
    ixStatus: index('ix_programs_status').on(t.status),
    ixOrganization: index('ix_programs_organization').on(t.organizationId),
  }),
);

export const batches = sqliteTable(
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
    startDate: text('start_date'),
    endDate: text('end_date'),
    status: text('status').notNull().default('DRAFT'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    uxProgramCode: uniqueIndex('ux_batches_program_code').on(t.programId, t.code),
    ixProgram: index('ix_batches_program').on(t.programId),
    ixStatus: index('ix_batches_status').on(t.status),
    ixCode: index('ix_batches_code').on(t.code),
  }),
);

export const programParticipants = sqliteTable(
  'program_participants',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id),
    batchId: text('batch_id')
      .notNull()
      .references(() => batches.id),
    organizationId: text('organization_id').references(() => organizations.id),
    employeeId: text('employee_id'),
    position: text('position'),
    unit: text('unit'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxEnrollment: uniqueIndex('ux_program_participants_enrollment').on(
      t.programId,
      t.batchId,
      t.userId,
    ),
    ixUser: index('ix_program_participants_user').on(t.userId),
  }),
);

export const adminScopes = sqliteTable(
  'admin_scopes',
  {
    id: text('id').primaryKey(),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => users.id),
    programId: text('program_id').references(() => programs.id),
    batchId: text('batch_id').references(() => batches.id),
    organizationId: text('organization_id').references(() => organizations.id),
    createdAt: text('created_at').notNull().default(now),
    createdBy: text('created_by'),
  },
  (t) => ({
    ixAdmin: index('ix_admin_scopes_admin').on(t.adminUserId),
  }),
);

export const assessmentTypes = sqliteTable(
  'assessment_types',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color'),
    icon: text('icon'),
    orderIndex: integer('order_index').notNull().default(0),
    isSelf: integer('is_self').notNull().default(0),
    requiresEvaluatorRelation: integer('requires_evaluator_relation').notNull().default(1),
    defaultTarget: integer('default_target').notNull().default(0),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_assessment_types_code').on(t.code),
  }),
);

export const participantAssessmentTargets = sqliteTable(
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
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxTarget: uniqueIndex('ux_participant_targets').on(t.programParticipantId, t.assessmentTypeId),
  }),
);

export const evaluatorRelations = sqliteTable(
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
    assignedAt: text('assigned_at'),
    assignedBy: text('assigned_by'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxRelation: uniqueIndex('ux_evaluator_relations').on(
      t.programParticipantId,
      t.evaluatorUserId,
      t.assessmentTypeId,
    ),
    ixParticipant: index('ix_evaluator_relations_participant').on(t.programParticipantId),
    ixEvaluator: index('ix_evaluator_relations_evaluator').on(t.evaluatorUserId),
  }),
);

export const questionnaires = sqliteTable(
  'questionnaires',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('DRAFT'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_questionnaires_code').on(t.code),
  }),
);

export const questionnaireVersions = sqliteTable(
  'questionnaire_versions',
  {
    id: text('id').primaryKey(),
    questionnaireId: text('questionnaire_id')
      .notNull()
      .references(() => questionnaires.id),
    versionNumber: integer('version_number').notNull(),
    status: text('status').notNull().default('DRAFT'),
    publishedAt: text('published_at'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => ({
    uxVersion: uniqueIndex('ux_questionnaire_versions').on(t.questionnaireId, t.versionNumber),
  }),
);

export const questions = sqliteTable(
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
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => ({
    ixVersion: index('ix_questions_version').on(t.questionnaireVersionId),
  }),
);

export const questionOptions = sqliteTable(
  'question_options',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id),
    label: text('label').notNull(),
    value: text('value').notNull(),
    isCorrect: integer('is_correct').notNull().default(0),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => ({
    ixQuestion: index('ix_question_options_question').on(t.questionId),
  }),
);

export const assessmentAssignments = sqliteTable(
  'assessment_assignments',
  {
    id: text('id').primaryKey(),
    evaluatorRelationId: text('evaluator_relation_id')
      .notNull()
      .references(() => evaluatorRelations.id),
    questionnaireVersionId: text('questionnaire_version_id')
      .notNull()
      .references(() => questionnaireVersions.id),
    status: text('status').notNull().default('ASSIGNED'),
    assignedAt: text('assigned_at'),
    availableFrom: text('available_from'),
    dueAt: text('due_at'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    ixRelation: index('ix_assignments_relation').on(t.evaluatorRelationId),
    ixStatus: index('ix_assignments_status').on(t.status),
  }),
);

export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id')
      .notNull()
      .references(() => assessmentAssignments.id),
    status: text('status').notNull().default('NOT_STARTED'),
    startedAt: text('started_at'),
    lastActivityAt: text('last_activity_at'),
    submittedAt: text('submitted_at'),
    version: integer('version').notNull().default(0),
    score: integer('score'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    ixAssignment: index('ix_attempts_assignment').on(t.assignmentId),
    ixStatus: index('ix_attempts_status').on(t.status),
  }),
);

export const answers = sqliteTable(
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
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxAnswer: uniqueIndex('ux_answers_attempt_question').on(t.attemptId, t.questionId),
    ixAttempt: index('ix_answers_attempt').on(t.attemptId),
  }),
);

export const answerOptions = sqliteTable(
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

export const quizzes = sqliteTable(
  'quizzes',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('DRAFT'),
    questionsPerPage: integer('questions_per_page').notNull().default(10),
    passingScore: integer('passing_score'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    uxCode: uniqueIndex('ux_quizzes_code').on(t.code),
  }),
);

export const quizQuestions = sqliteTable(
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

export const auditLogs = sqliteTable(
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
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => ({
    ixActor: index('ix_audit_logs_actor').on(t.actorId),
    ixCreatedAt: index('ix_audit_logs_created_at').on(t.createdAt),
  }),
);

export const importJobs = sqliteTable('import_jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  status: text('status').notNull().default('PENDING'),
  summary: text('summary'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
});

export const exportJobs = sqliteTable('export_jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  status: text('status').notNull().default('PENDING'),
  fileKey: text('file_key'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
});

export const systemSettings = sqliteTable('system_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  value: text('value'),
  updatedAt: text('updated_at').notNull().default(now),
});
