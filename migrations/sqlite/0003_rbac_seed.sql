-- Seed RBAC Phase 3: role dan permission minimum. Idempotent (INSERT OR IGNORE).

INSERT OR IGNORE INTO roles (id, code, name, created_at, updated_at) VALUES
  ('role_superadmin', 'SUPERADMIN', 'Super Admin', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('role_admin', 'ADMIN', 'Admin', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('role_user', 'USER', 'User', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_user_read', 'user.read', 'Melihat user'),
  ('perm_user_create', 'user.create', 'Membuat user'),
  ('perm_user_update', 'user.update', 'Mengubah user'),
  ('perm_user_delete', 'user.delete', 'Menghapus user'),
  ('perm_admin_manage', 'admin.manage', 'Mengelola admin'),
  ('perm_program_read', 'program.read', 'Melihat program'),
  ('perm_program_manage', 'program.manage', 'Mengelola program'),
  ('perm_batch_read', 'batch.read', 'Melihat batch'),
  ('perm_batch_manage', 'batch.manage', 'Mengelola batch'),
  ('perm_assessment_read', 'assessment.read', 'Melihat assessment'),
  ('perm_assessment_manage', 'assessment.manage', 'Mengelola assessment'),
  ('perm_evaluator_read', 'evaluator.read', 'Melihat evaluator'),
  ('perm_evaluator_manage', 'evaluator.manage', 'Mengelola evaluator'),
  ('perm_quiz_read', 'quiz.read', 'Melihat quiz'),
  ('perm_quiz_manage', 'quiz.manage', 'Mengelola quiz'),
  ('perm_monitoring_read', 'monitoring.read', 'Melihat monitoring'),
  ('perm_report_read', 'report.read', 'Melihat report'),
  ('perm_report_export', 'report.export', 'Mengekspor report'),
  ('perm_attempt_reset', 'attempt.reset', 'Reset attempt'),
  ('perm_attempt_force_submit', 'attempt.force_submit', 'Force submit attempt'),
  ('perm_settings_manage', 'settings.manage', 'Mengelola settings'),
  ('perm_audit_read', 'audit.read', 'Melihat audit log');

-- SUPERADMIN mendapatkan seluruh permission.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_sa_' || p.id, 'role_superadmin', p.id FROM permissions p;

-- ADMIN mendapatkan subset read pada Phase 3.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_ad_' || p.id, 'role_admin', p.id FROM permissions p
WHERE p.code IN (
  'user.read',
  'program.read',
  'batch.read',
  'assessment.read',
  'evaluator.read',
  'quiz.read',
  'monitoring.read',
  'report.read',
  'report.export',
  'audit.read'
);
