-- Migration Phase 4: master data dan access administration.
-- Tidak mengubah migration 0001, 0002, atau 0003 yang sudah di-commit.

-- Relasi organisasi pada program untuk konsistensi admin scope dan filter.
ALTER TABLE programs ADD COLUMN organization_id TEXT REFERENCES organizations(id);

-- Permission organization (Phase 4). Idempotent.
INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_organization_read', 'organization.read', 'Melihat organization'),
  ('perm_organization_manage', 'organization.manage', 'Mengelola organization');

-- SUPERADMIN mendapatkan seluruh permission organization.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_sa_' || p.id, 'role_superadmin', p.id FROM permissions p
WHERE p.code IN ('organization.read', 'organization.manage');

-- ADMIN mendapatkan permission Phase 4 untuk mengelola master data sesuai scope.
-- Catatan: user.read, program.read, dan batch.read sudah diberikan pada 0003.
-- admin.manage tetap khusus SUPERADMIN (tidak diberikan di sini).
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_ad_' || p.id, 'role_admin', p.id FROM permissions p
WHERE p.code IN (
  'user.create',
  'user.update',
  'organization.read',
  'organization.manage',
  'program.manage',
  'batch.manage'
);

-- Index pencarian/filter Phase 4. Tidak menduplikasi index yang sudah ada.
CREATE INDEX ix_users_status ON users (status);
CREATE INDEX ix_organizations_status ON organizations (status);
CREATE INDEX ix_programs_status ON programs (status);
CREATE INDEX ix_programs_organization ON programs (organization_id);
CREATE INDEX ix_batches_status ON batches (status);
CREATE INDEX ix_batches_code ON batches (code);
