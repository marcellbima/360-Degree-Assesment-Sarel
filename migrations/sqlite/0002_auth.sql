-- Migration Phase 3: kebutuhan tambahan untuk autentikasi.
-- Tidak mengubah migration 0001 yang sudah ada.

-- Korelasi request pada audit log.
ALTER TABLE audit_logs ADD COLUMN request_id TEXT;

-- Index yang dibutuhkan untuk validasi session dan lockout login.
CREATE INDEX ix_sessions_expires_at ON sessions (expires_at);
CREATE INDEX ix_login_attempts_user ON login_attempts (user_id);
CREATE INDEX ix_login_attempts_ip ON login_attempts (ip_address);
CREATE INDEX ix_login_attempts_user_input ON login_attempts (user_id_input);
