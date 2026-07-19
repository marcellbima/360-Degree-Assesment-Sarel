-- Jalankan satu kali pada PostgreSQL sebelum menggunakan aturan User ID case-insensitive.
-- Script berhenti bila data lama memiliki User ID yang hanya berbeda huruf besar/kecil.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    GROUP BY lower(user_id)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Terdapat User ID duplikat jika huruf besar/kecil diabaikan.';
  END IF;
END
$$;

DROP INDEX IF EXISTS ux_users_user_id;
CREATE UNIQUE INDEX ux_users_user_id ON users (lower(user_id));
