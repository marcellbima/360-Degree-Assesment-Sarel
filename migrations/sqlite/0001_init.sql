-- Migration awal Phase 2 untuk Cloudflare D1 (SQLite).
-- Mengikuti docs/ERD_DRAFT.md. Foreign key, unique constraint, dan
-- partial unique index untuk assignment aktif disertakan.

PRAGMA foreign_keys = ON;

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_organizations_code ON organizations (code);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  npk TEXT,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  unit TEXT,
  division TEXT,
  organization_id TEXT REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  must_change_password INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT
);
CREATE UNIQUE INDEX ux_users_user_id ON users (user_id);
CREATE INDEX ix_users_npk ON users (npk);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_roles_code ON roles (code);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  description TEXT
);
CREATE UNIQUE INDEX ux_permissions_code ON permissions (code);

CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id)
);
CREATE UNIQUE INDEX ux_user_roles_user_role ON user_roles (user_id, role_id);

CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES roles(id),
  permission_id TEXT NOT NULL REFERENCES permissions(id)
);
CREATE UNIQUE INDEX ux_role_permissions_role_perm ON role_permissions (role_id, permission_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE UNIQUE INDEX ux_sessions_token_hash ON sessions (token_hash);
CREATE INDEX ix_sessions_user ON sessions (user_id);

CREATE TABLE login_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  user_id_input TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_login_attempts_created_at ON login_attempts (created_at);

CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT
);
CREATE UNIQUE INDEX ux_programs_code ON programs (code);

CREATE TABLE batches (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT
);
CREATE UNIQUE INDEX ux_batches_program_code ON batches (program_id, code);
CREATE INDEX ix_batches_program ON batches (program_id);

CREATE TABLE program_participants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  program_id TEXT NOT NULL REFERENCES programs(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  organization_id TEXT REFERENCES organizations(id),
  employee_id TEXT,
  position TEXT,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_program_participants_enrollment
  ON program_participants (program_id, batch_id, user_id);
CREATE INDEX ix_program_participants_user ON program_participants (user_id);

CREATE TABLE admin_scopes (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id),
  program_id TEXT REFERENCES programs(id),
  batch_id TEXT REFERENCES batches(id),
  organization_id TEXT REFERENCES organizations(id),
  created_at TEXT NOT NULL,
  created_by TEXT,
  -- Minimal satu dari ketiga scope wajib terisi.
  CHECK (program_id IS NOT NULL OR batch_id IS NOT NULL OR organization_id IS NOT NULL)
);
CREATE INDEX ix_admin_scopes_admin ON admin_scopes (admin_user_id);

CREATE TABLE assessment_types (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_self INTEGER NOT NULL DEFAULT 0,
  requires_evaluator_relation INTEGER NOT NULL DEFAULT 1,
  default_target INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_assessment_types_code ON assessment_types (code);

CREATE TABLE participant_assessment_targets (
  id TEXT PRIMARY KEY,
  program_participant_id TEXT NOT NULL REFERENCES program_participants(id),
  assessment_type_id TEXT NOT NULL REFERENCES assessment_types(id),
  target_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_participant_targets
  ON participant_assessment_targets (program_participant_id, assessment_type_id);

CREATE TABLE evaluator_relations (
  id TEXT PRIMARY KEY,
  program_participant_id TEXT NOT NULL REFERENCES program_participants(id),
  evaluator_user_id TEXT NOT NULL REFERENCES users(id),
  assessment_type_id TEXT NOT NULL REFERENCES assessment_types(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  assigned_at TEXT,
  assigned_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_evaluator_relations
  ON evaluator_relations (program_participant_id, evaluator_user_id, assessment_type_id);
CREATE INDEX ix_evaluator_relations_participant ON evaluator_relations (program_participant_id);
CREATE INDEX ix_evaluator_relations_evaluator ON evaluator_relations (evaluator_user_id);

CREATE TABLE questionnaires (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_questionnaires_code ON questionnaires (code);

CREATE TABLE questionnaire_versions (
  id TEXT PRIMARY KEY,
  questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id),
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  published_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_questionnaire_versions
  ON questionnaire_versions (questionnaire_id, version_number);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  questionnaire_version_id TEXT NOT NULL REFERENCES questionnaire_versions(id),
  code TEXT,
  text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_questions_version ON questions (questionnaire_version_id);

CREATE TABLE question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_question_options_question ON question_options (question_id);

CREATE TABLE assessment_assignments (
  id TEXT PRIMARY KEY,
  evaluator_relation_id TEXT NOT NULL REFERENCES evaluator_relations(id),
  questionnaire_version_id TEXT NOT NULL REFERENCES questionnaire_versions(id),
  status TEXT NOT NULL DEFAULT 'ASSIGNED',
  assigned_at TEXT,
  available_from TEXT,
  due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX ix_assignments_relation ON assessment_assignments (evaluator_relation_id);
CREATE INDEX ix_assignments_status ON assessment_assignments (status);
-- Cegah lebih dari satu assignment aktif untuk pasangan relation dan versi kuesioner.
CREATE UNIQUE INDEX ux_active_assignment
  ON assessment_assignments (evaluator_relation_id, questionnaire_version_id)
  WHERE status IN ('ASSIGNED', 'AVAILABLE', 'IN_PROGRESS');

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assessment_assignments(id),
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  started_at TEXT,
  last_activity_at TEXT,
  submitted_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX ix_attempts_assignment ON attempts (assignment_id);
CREATE INDEX ix_attempts_status ON attempts (status);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES attempts(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  value TEXT,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_answers_attempt_question ON answers (attempt_id, question_id);
CREATE INDEX ix_answers_attempt ON answers (attempt_id);

CREATE TABLE answer_options (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES answers(id),
  option_id TEXT NOT NULL REFERENCES question_options(id)
);
CREATE INDEX ix_answer_options_answer ON answer_options (answer_id);

CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  questions_per_page INTEGER NOT NULL DEFAULT 10,
  passing_score INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_quizzes_code ON quizzes (code);

CREATE TABLE quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_quiz_questions ON quiz_questions (quiz_id, question_id);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX ix_audit_logs_created_at ON audit_logs (created_at);

CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  summary TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE export_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  file_key TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE system_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_system_settings_key ON system_settings (key);
