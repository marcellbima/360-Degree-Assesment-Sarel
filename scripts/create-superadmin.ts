/**
 * Bootstrap SUPERADMIN pertama untuk local development.
 *
 * Membaca kredensial dari environment lokal, memvalidasi password, menghitung
 * hash menggunakan PasswordService yang sama dengan aplikasi, lalu menulis SQL
 * idempotent ke scripts/superadmin.generated.sql (gitignored).
 *
 * Password tidak pernah dicetak ke log dan tidak disimpan di repository.
 *
 * Jalankan: node scripts/create-superadmin.ts
 * Lalu terapkan ke D1 lokal:
 *   wrangler d1 execute sarel-assessment --local --file scripts/superadmin.generated.sql
 */
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { PasswordService, validatePasswordStrength } from '@sarel/core';

const OUTPUT_PATH = 'scripts/superadmin.generated.sql';

function fail(message: string): never {
  console.error(`[bootstrap] ${message}`);
  process.exit(1);
}

function validatePassword(password: string): void {
  const error = validatePasswordStrength(password);
  if (error) {
    fail(`BOOTSTRAP_SUPERADMIN_PASSWORD: ${error}`);
  }
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  const userId = (process.env.BOOTSTRAP_SUPERADMIN_USER_ID ?? '').trim();
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD ?? '';
  const pepper = process.env.PASSWORD_PEPPER ?? '';
  const iterations = Number(process.env.PASSWORD_PBKDF2_ITERATIONS ?? '100000');

  if (userId.length === 0) {
    fail('BOOTSTRAP_SUPERADMIN_USER_ID wajib diisi.');
  }
  validatePassword(password);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    fail('PASSWORD_PBKDF2_ITERATIONS tidak valid.');
  }
  if (pepper.length === 0) {
    fail('PASSWORD_PEPPER kosong. Setel pepper sebelum membuat akun.');
  }

  const passwordHash = await new PasswordService(pepper, iterations).hash(password);
  const now = new Date().toISOString();
  const userPk = 'user_superadmin';

  const sql = `-- File dihasilkan otomatis. Jangan commit.\n${[
    `INSERT OR IGNORE INTO users (id, user_id, full_name, password_hash, status, must_change_password, created_at, updated_at)`,
    `VALUES (${sqlString(userPk)}, ${sqlString(userId)}, ${sqlString('Super Admin')}, ${sqlString(
      passwordHash,
    )}, 'ACTIVE', 0, ${sqlString(now)}, ${sqlString(now)});`,
    `INSERT OR IGNORE INTO user_roles (id, user_id, role_id) VALUES (${sqlString(
      'ur_superadmin',
    )}, ${sqlString(userPk)}, 'role_superadmin');`,
  ].join('\n')}\n`;

  writeFileSync(OUTPUT_PATH, sql, 'utf8');
  console.log(`[bootstrap] SQL idempotent ditulis ke ${OUTPUT_PATH} untuk User ID "${userId}".`);
  console.log(
    `[bootstrap] Terapkan: wrangler d1 execute sarel-assessment --local --file ${OUTPUT_PATH}`,
  );
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : 'Gagal membuat SUPERADMIN.');
});
