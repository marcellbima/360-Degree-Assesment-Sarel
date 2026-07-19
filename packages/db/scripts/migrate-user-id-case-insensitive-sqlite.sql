-- Jalankan satu kali pada SQLite/D1 sebelum menggunakan aturan User ID case-insensitive.
-- Periksa duplikat terlebih dahulu:
-- SELECT lower(user_id), count(*) FROM users GROUP BY lower(user_id) HAVING count(*) > 1;

DROP INDEX IF EXISTS ux_users_user_id;
CREATE UNIQUE INDEX ux_users_user_id ON users (lower(user_id));
