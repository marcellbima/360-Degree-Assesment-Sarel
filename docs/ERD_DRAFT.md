# ERD Draft

## 1. Entity Relationship Diagram

```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : grants
  roles ||--o{ role_permissions : has
  permissions ||--o{ role_permissions : in
  users ||--o{ sessions : owns
  users ||--o{ login_attempts : logs
  users ||--o{ admin_scopes : "scoped admin"
  users ||--o{ audit_logs : acts
  users ||--o{ import_jobs : created_by
  users ||--o{ export_jobs : created_by

  organizations ||--o{ program_participants : classifies
  organizations ||--o{ admin_scopes : limits

  programs ||--o{ batches : has
  programs ||--o{ program_participants : enrolls
  programs ||--o{ admin_scopes : limits
  batches ||--o{ program_participants : groups
  batches ||--o{ admin_scopes : limits
  users ||--o{ program_participants : "enrolled as"

  program_participants ||--o{ participant_assessment_targets : targets
  assessment_types ||--o{ participant_assessment_targets : typed

  program_participants ||--o{ evaluator_relations : "is subject"
  users ||--o{ evaluator_relations : "is evaluator"
  assessment_types ||--o{ evaluator_relations : typed

  evaluator_relations ||--o{ assessment_assignments : produces
  questionnaires ||--o{ questionnaire_versions : versioned
  questionnaire_versions ||--o{ questions : contains
  questionnaire_versions ||--o{ assessment_assignments : delivered_as
  questions ||--o{ question_options : has

  quizzes ||--o{ quiz_questions : contains
  questions ||--o{ quiz_questions : reused

  assessment_assignments ||--o{ attempts : has
  attempts ||--o{ answers : records
  answers ||--o{ answer_options : selects
  question_options ||--o{ answer_options : chosen_as
  questions ||--o{ answers : answered

  users {
    text id PK
    text user_id
    text full_name
    text password_hash
    text status
  }
  roles {
    text id PK
    text code
    text name
  }
  permissions {
    text id PK
    text code
  }
  user_roles {
    text id PK
    text user_id FK
    text role_id FK
  }
  role_permissions {
    text id PK
    text role_id FK
    text permission_id FK
  }
  sessions {
    text id PK
    text user_id FK
    text token_hash
    text expires_at
  }
  login_attempts {
    text id PK
    text user_id FK
    text ip_address
    text created_at
  }
  organizations {
    text id PK
    text code
    text name
    text status
  }
  programs {
    text id PK
    text code
    text name
    text status
  }
  batches {
    text id PK
    text program_id FK
    text code
    text name
    text status
  }
  program_participants {
    text id PK
    text user_id FK
    text program_id FK
    text batch_id FK
    text organization_id FK
    text employee_id
    text position
    text unit
    text status
  }
  admin_scopes {
    text id PK
    text admin_user_id FK
    text program_id FK
    text batch_id FK
    text organization_id FK
    text created_by
  }
  assessment_types {
    text id PK
    text code
    text name
    integer is_self
  }
  participant_assessment_targets {
    text id PK
    text program_participant_id FK
    text assessment_type_id FK
    integer target_count
  }
  evaluator_relations {
    text id PK
    text program_participant_id FK
    text evaluator_user_id FK
    text assessment_type_id FK
    text status
  }
  questionnaires {
    text id PK
    text code
    text title
    text status
  }
  questionnaire_versions {
    text id PK
    text questionnaire_id FK
    integer version_number
    text status
    text published_at
  }
  questions {
    text id PK
    text questionnaire_version_id FK
    text question_type
  }
  question_options {
    text id PK
    text question_id FK
    integer is_correct
  }
  assessment_assignments {
    text id PK
    text evaluator_relation_id FK
    text questionnaire_version_id FK
    text status
    text assigned_at
    text available_from
    text due_at
  }
  attempts {
    text id PK
    text assignment_id FK
    text status
    text started_at
    text submitted_at
  }
  answers {
    text id PK
    text attempt_id FK
    text question_id FK
    text value
  }
  answer_options {
    text id PK
    text answer_id FK
    text option_id FK
  }
  quizzes {
    text id PK
    text code
    text title
    text status
  }
  quiz_questions {
    text id PK
    text quiz_id FK
    text question_id FK
  }
  audit_logs {
    text id PK
    text actor_id FK
    text action
    text created_at
  }
  import_jobs {
    text id PK
    text created_by FK
    text status
  }
  export_jobs {
    text id PK
    text created_by FK
    text status
  }
```

## 2. Cardinality Notes

- users 1:N program_participants
- programs 1:N batches
- programs 1:N program_participants
- batches 1:N program_participants
- organizations 1:N program_participants
- program_participants 1:N participant_assessment_targets
- assessment_types 1:N participant_assessment_targets
- program_participants 1:N evaluator_relations
- users 1:N evaluator_relations sebagai evaluator
- assessment_types 1:N evaluator_relations
- evaluator_relations 1:N assessment_assignments
- questionnaires 1:N questionnaire_versions
- questionnaire_versions 1:N questions
- questionnaire_versions 1:N assessment_assignments
- assessment_assignments 1:N attempts
- attempts 1:N answers
- questions 1:N answers
- question_options 1:N answer_options

Program dan batch dari sebuah evaluator_relation tidak disimpan langsung pada evaluator_relations. Keduanya diperoleh melalui jalur evaluator_relations ke program_participants ke program_id dan batch_id. Hal ini mencegah duplikasi dan menjaga satu sumber kebenaran enrollment pada program_participants.

## 3. Unique Constraints

- unique users.user_id
- unique organizations.code
- unique programs.code
- unique batches(program_id, code)
- unique questionnaire_versions(questionnaire_id, version_number)
- unique program_participants(program_id, batch_id, user_id)
- unique participant_assessment_targets(program_participant_id, assessment_type_id)
- unique evaluator_relations(program_participant_id, evaluator_user_id, assessment_type_id)
- unique answers(attempt_id, question_id)
- unique user_roles(user_id, role_id)
- unique role_permissions(role_id, permission_id)
- unique sessions(token_hash)

Foreign key tambahan:

- answer_options.option_id mereferensikan question_options.id.

## 4. Active Assignment Partial Unique Index

SQLite dan Cloudflare D1 tidak mendukung filter unique melalui konstrain tabel biasa, sehingga aturan satu assignment aktif per kombinasi evaluator_relation_id dan questionnaire_version_id diterapkan melalui partial unique index.

Status assignment yang dianggap aktif:

- ASSIGNED
- AVAILABLE
- IN_PROGRESS

Status yang tidak dianggap aktif dan tidak terkena pembatasan ini:

- SUBMITTED
- EXPIRED
- CLOSED
- CANCELLED

Definisi index:

```sql
CREATE UNIQUE INDEX ux_active_assignment
ON assessment_assignments (evaluator_relation_id, questionnaire_version_id)
WHERE status IN ('ASSIGNED', 'AVAILABLE', 'IN_PROGRESS');
```

Index ini mencegah lebih dari satu assignment aktif untuk pasangan evaluator_relation_id dan questionnaire_version_id yang sama, sambil tetap mengizinkan beberapa assignment historis yang sudah tidak aktif.

## 5. Not Null Notes

- program_participants.batch_id bersifat NOT NULL. Setiap participant wajib masuk ke dalam satu batch.
- program_participants.organization_id bersifat nullable.
- admin_scopes.program_id, admin_scopes.batch_id, dan admin_scopes.organization_id bersifat nullable, dan masing-masing memiliki foreign key valid ke tabel terkait.
