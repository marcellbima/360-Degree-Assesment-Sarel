-- Sinkronisasi RBAC empat role untuk instalasi SQLite/D1 lama.
-- Idempotent dan aman dijalankan kembali.

INSERT OR IGNORE INTO roles (
  id,
  code,
  name,
  created_at,
  updated_at
)
VALUES
  (
    'role_evaluator',
    'EVALUATOR',
    'Evaluator',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

INSERT OR IGNORE INTO permissions (
  id,
  code,
  description
)
VALUES
  (
    'perm_organization_read',
    'organization.read',
    'Melihat struktur organisasi'
  ),
  (
    'perm_organization_manage',
    'organization.manage',
    'Mengelola struktur organisasi'
  ),
  (
    'perm_participant_read',
    'participant.read',
    'Melihat peserta'
  ),
  (
    'perm_participant_manage',
    'participant.manage',
    'Mengelola peserta'
  ),
  (
    'perm_participant_import',
    'participant.import',
    'Mengimpor peserta'
  ),
  (
    'perm_evaluator_import',
    'evaluator.import',
    'Mengimpor relasi penilai'
  ),
  (
    'perm_dashboard_evaluator_read',
    'dashboard.evaluator.read',
    'Melihat Dashboard Evaluator'
  );

DELETE FROM role_permissions
WHERE role_id IN (
  'role_superadmin',
  'role_admin',
  'role_evaluator',
  'role_user'
);

INSERT OR IGNORE INTO role_permissions (
  id,
  role_id,
  permission_id
)
SELECT
  'rp_sa_' || p.id,
  'role_superadmin',
  p.id
FROM permissions p;

INSERT OR IGNORE INTO role_permissions (
  id,
  role_id,
  permission_id
)
SELECT
  'rp_ad_' || p.id,
  'role_admin',
  p.id
FROM permissions p
WHERE p.code IN (
  'user.read',
  'user.create',
  'user.update',
  'user.delete',
  'admin.manage',
  'organization.read',
  'organization.manage',
  'program.read',
  'program.manage',
  'batch.read',
  'batch.manage',
  'participant.read',
  'participant.manage',
  'participant.import',
  'assessment.read',
  'assessment.manage',
  'evaluator.read',
  'evaluator.manage',
  'evaluator.import',
  'quiz.read',
  'quiz.manage',
  'monitoring.read',
  'report.read',
  'report.export',
  'attempt.reset',
  'attempt.force_submit'
);

INSERT OR IGNORE INTO role_permissions (
  id,
  role_id,
  permission_id
)
SELECT
  'rp_ev_' || p.id,
  'role_evaluator',
  p.id
FROM permissions p
WHERE p.code = 'dashboard.evaluator.read';
