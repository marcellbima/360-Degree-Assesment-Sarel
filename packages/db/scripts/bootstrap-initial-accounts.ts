import process from 'node:process';
import { Client } from 'pg';
import {
  PasswordService,
  validatePasswordStrength,
} from '@sarel/core';

interface InitialAccount {
  stableId: string;
  userId: string;
  fullName: string;
  password: string;
  roleCode: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} wajib diisi.`);
  }

  return value;
}

async function main(): Promise<void> {
  const databaseUrl = requiredEnv('DATABASE_URL');
  const pepper = requiredEnv('PASSWORD_PEPPER');
  const iterations = Number(
    process.env.PASSWORD_PBKDF2_ITERATIONS ?? '100000',
  );

  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error(
      'PASSWORD_PBKDF2_ITERATIONS tidak valid.',
    );
  }

  const accounts: InitialAccount[] = [
    {
      stableId: 'user_superadmin',
      userId: requiredEnv(
        'BOOTSTRAP_SUPERADMIN_USER_ID',
      ),
      fullName: 'Super Admin',
      password: requiredEnv(
        'BOOTSTRAP_SUPERADMIN_PASSWORD',
      ),
      roleCode: 'SUPERADMIN',
    },
    {
      stableId: 'user_admin',
      userId: requiredEnv(
        'BOOTSTRAP_ADMIN_USER_ID',
      ),
      fullName: 'Admin',
      password: requiredEnv(
        'BOOTSTRAP_ADMIN_PASSWORD',
      ),
      roleCode: 'ADMIN',
    },
    {
      stableId: 'user_evaluator',
      userId: requiredEnv(
        'BOOTSTRAP_EVALUATOR_USER_ID',
      ),
      fullName: 'Evaluator',
      password: requiredEnv(
        'BOOTSTRAP_EVALUATOR_PASSWORD',
      ),
      roleCode: 'EVALUATOR',
    },
    {
      stableId: 'user_user',
      userId: requiredEnv(
        'BOOTSTRAP_USER_USER_ID',
      ),
      fullName: 'User',
      password: requiredEnv(
        'BOOTSTRAP_USER_PASSWORD',
      ),
      roleCode: 'USER',
    },
  ];

  for (const account of accounts) {
    const error =
      validatePasswordStrength(account.password);

    if (error) {
      throw new Error(
        `${account.userId}: ${error}`,
      );
    }
  }

  const passwords =
    new PasswordService(pepper, iterations);

  const client =
    new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    await client.query('BEGIN');

    for (const account of accounts) {
      const roleResult = await client.query<{
        id: string;
      }>(
        `
          SELECT id
          FROM roles
          WHERE code = $1
          LIMIT 1
        `,
        [account.roleCode],
      );

      const roleId = roleResult.rows[0]?.id;

      if (!roleId) {
        throw new Error(
          `Role ${account.roleCode} belum tersedia.`,
        );
      }

      const passwordHash =
        await passwords.hash(account.password);

      const userResult = await client.query<{
        id: string;
      }>(
        `
          INSERT INTO users (
            id,
            user_id,
            full_name,
            password_hash,
            status,
            must_change_password,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'ACTIVE',
            false,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (user_id)
          DO UPDATE SET
            full_name = EXCLUDED.full_name,
            password_hash = EXCLUDED.password_hash,
            status = 'ACTIVE',
            must_change_password = false,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `,
        [
          account.stableId,
          account.userId,
          account.fullName,
          passwordHash,
        ],
      );

      const userPk = userResult.rows[0]?.id;

      if (!userPk) {
        throw new Error(
          `Gagal membuat akun ${account.userId}.`,
        );
      }

      await client.query(
        `
          DELETE FROM user_roles
          WHERE user_id = $1
        `,
        [userPk],
      );

      await client.query(
        `
          INSERT INTO user_roles (
            id,
            user_id,
            role_id
          )
          VALUES (
            $1,
            $2,
            $3
          )
          ON CONFLICT (user_id, role_id)
          DO NOTHING
        `,
        [
          `ur_${account.roleCode.toLowerCase()}_${userPk}`,
          userPk,
          roleId,
        ],
      );

      await client.query(
        `
          UPDATE sessions
          SET revoked_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
            AND revoked_at IS NULL
        `,
        [userPk],
      );

      console.log(
        `[bootstrap] ${account.userId} → ${account.roleCode}`,
      );
    }

    await client.query('COMMIT');
    console.log(
      '[bootstrap] Empat akun awal berhasil disiapkan.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Bootstrap akun gagal.',
  );
  process.exit(1);
});
