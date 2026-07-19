-- Seed RBAC final untuk aplikasi self-hosted PostgreSQL.
-- Idempotent: aman dijalankan kembali.

INSERT INTO roles (
  id,
  code,
  name,
  created_at,
  updated_at
)
VALUES
  (
    'role_superadmin',
    'SUPERADMIN',
    'Super Admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'role_admin',
    'ADMIN',
    'Admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'role_evaluator',
    'EVALUATOR',
    'Evaluator',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'role_user',
    'USER',
    'User',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO permissions (
  id,
  code,
  description
)
VALUES
  ('perm_user_read', 'user.read', 'Melihat akun'),
  ('perm_user_create', 'user.create', 'Membuat akun'),
  ('perm_user_update', 'user.update', 'Mengubah akun'),
  ('perm_user_delete', 'user.delete', 'Menghapus akun'),
  ('perm_admin_manage', 'admin.manage', 'Mengelola role akun'),

  ('perm_organization_read', 'organization.read', 'Melihat struktur organisasi'),
  ('perm_organization_manage', 'organization.manage', 'Mengelola struktur organisasi'),

  ('perm_program_read', 'program.read', 'Melihat program assessment'),
  ('perm_program_manage', 'program.manage', 'Mengelola program assessment'),

  ('perm_batch_read', 'batch.read', 'Melihat batch'),
  ('perm_batch_manage', 'batch.manage', 'Mengelola batch'),

  ('perm_participant_read', 'participant.read', 'Melihat peserta'),
  ('perm_participant_manage', 'participant.manage', 'Mengelola peserta'),
  ('perm_participant_import', 'participant.import', 'Mengimpor peserta'),

  ('perm_assessment_read', 'assessment.read', 'Melihat assessment'),
  ('perm_assessment_manage', 'assessment.manage', 'Mengelola assessment'),

  ('perm_evaluator_read', 'evaluator.read', 'Melihat relasi penilai'),
  ('perm_evaluator_manage', 'evaluator.manage', 'Mengelola relasi penilai'),
  ('perm_evaluator_import', 'evaluator.import', 'Mengimpor relasi penilai'),

  ('perm_quiz_read', 'quiz.read', 'Melihat form assessment'),
  ('perm_quiz_manage', 'quiz.manage', 'Mengelola form assessment'),

  ('perm_monitoring_read', 'monitoring.read', 'Melihat monitoring pengerjaan'),
  (
    'perm_dashboard_evaluator_read',
    'dashboard.evaluator.read',
    'Melihat Dashboard Evaluator'
  ),

  ('perm_report_read', 'report.read', 'Melihat laporan'),
  ('perm_report_export', 'report.export', 'Mengekspor laporan'),

  ('perm_attempt_reset', 'attempt.reset', 'Mereset pengerjaan'),
  (
    'perm_attempt_force_submit',
    'attempt.force_submit',
    'Melakukan force submit'
  ),

  ('perm_settings_manage', 'settings.manage', 'Mengelola pengaturan sistem'),
  ('perm_audit_read', 'audit.read', 'Melihat log aktivitas')
ON CONFLICT (code)
DO UPDATE SET
  description = EXCLUDED.description;

-- Bersihkan assignment lama agar kebijakan role menjadi pasti.
DELETE FROM role_permissions
WHERE role_id IN (
  'role_superadmin',
  'role_admin',
  'role_evaluator',
  'role_user'
);

-- Super Admin memperoleh seluruh permission.
INSERT INTO role_permissions (
  id,
  role_id,
  permission_id
)
SELECT
  'rp_sa_' || p.id,
  'role_superadmin',
  p.id
FROM permissions p
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Admin memperoleh seluruh akses operasional,
-- tetapi tidak memperoleh pengaturan sistem dan audit log.
INSERT INTO role_permissions (
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
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Evaluator hanya memperoleh akses ke Dashboard Evaluator.
INSERT INTO role_permissions (
  id,
  role_id,
  permission_id
)
SELECT
  'rp_ev_' || p.id,
  'role_evaluator',
  p.id
FROM permissions p
WHERE p.code = 'dashboard.evaluator.read'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- USER sengaja tidak memperoleh permission administratif.
