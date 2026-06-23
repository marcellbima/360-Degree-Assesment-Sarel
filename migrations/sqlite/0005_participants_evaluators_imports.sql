-- Migration Phase 5: participant management, evaluator relations, assessment targets, import foundation.
-- Additive saja. Tidak mengubah migration 0001 sampai 0004.

-- ---- Assessment types (seed, idempotent) ----
-- Dibutuhkan oleh participant_assessment_targets dan evaluator_relations.
INSERT OR IGNORE INTO assessment_types (id, code, name, is_self, requires_evaluator_relation, order_index, status, created_at, updated_at) VALUES
  ('atype_self', 'SELF', 'Self', 1, 0, 0, 'ACTIVE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('atype_superior', 'SUPERIOR', 'Superior', 0, 1, 1, 'ACTIVE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('atype_peer', 'PEER', 'Peer', 0, 1, 2, 'ACTIVE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('atype_subordinate', 'SUBORDINATE', 'Subordinate', 0, 1, 3, 'ACTIVE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

-- ---- Permissions Phase 5 (idempotent) ----
INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_participant_read', 'participant.read', 'Melihat participant'),
  ('perm_participant_manage', 'participant.manage', 'Mengelola participant'),
  ('perm_participant_import', 'participant.import', 'Impor participant'),
  ('perm_evaluator_import', 'evaluator.import', 'Impor evaluator relation');

-- SUPERADMIN mendapatkan seluruh permission baru.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_sa_' || p.id, 'role_superadmin', p.id FROM permissions p
WHERE p.code IN ('participant.read', 'participant.manage', 'participant.import', 'evaluator.import');

-- ADMIN mendapatkan permission participant dan evaluator Phase 5.
-- evaluator.read sudah diberikan pada 0003. admin.manage tetap khusus SUPERADMIN.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_ad_' || p.id, 'role_admin', p.id FROM permissions p
WHERE p.code IN (
  'participant.read',
  'participant.manage',
  'participant.import',
  'evaluator.manage',
  'evaluator.import'
);

-- ---- Index participant ----
CREATE INDEX ix_program_participants_program ON program_participants (program_id);
CREATE INDEX ix_program_participants_batch ON program_participants (batch_id);
CREATE INDEX ix_program_participants_status ON program_participants (status);
-- Satu user hanya boleh satu kali menjadi participant aktif pada program yang sama.
CREATE UNIQUE INDEX ux_program_participants_active_user
  ON program_participants (program_id, user_id)
  WHERE status = 'ACTIVE';

-- ---- Index assessment target ----
CREATE INDEX ix_participant_targets_type ON participant_assessment_targets (assessment_type_id);

-- ---- Index evaluator relation ----
CREATE INDEX ix_evaluator_relations_type ON evaluator_relations (assessment_type_id);
CREATE INDEX ix_evaluator_relations_status ON evaluator_relations (status);

-- ---- Import job fields (additive) ----
ALTER TABLE import_jobs ADD COLUMN program_id TEXT REFERENCES programs(id);
ALTER TABLE import_jobs ADD COLUMN file_name TEXT;
ALTER TABLE import_jobs ADD COLUMN checksum TEXT;
ALTER TABLE import_jobs ADD COLUMN total_rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN valid_rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN skipped_rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN error_rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN error_summary TEXT;
ALTER TABLE import_jobs ADD COLUMN committed_at TEXT;
ALTER TABLE import_jobs ADD COLUMN expires_at TEXT;

CREATE INDEX ix_import_jobs_created_by ON import_jobs (created_by);
CREATE INDEX ix_import_jobs_status ON import_jobs (status);
CREATE INDEX ix_import_jobs_created_at ON import_jobs (created_at);

-- ---- Import job rows (normalized + hasil validasi per baris) ----
CREATE TABLE import_job_rows (
  id TEXT PRIMARY KEY,
  import_job_id TEXT NOT NULL REFERENCES import_jobs(id),
  row_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  normalized TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_import_job_rows_job ON import_job_rows (import_job_id);
CREATE UNIQUE INDEX ux_import_job_rows_job_row ON import_job_rows (import_job_id, row_number);
