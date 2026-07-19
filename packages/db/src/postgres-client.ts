import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

import * as schema from './schema/postgres-schema';

export interface CreatePostgresPoolOptions {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  applicationName?: string;
  ssl?: PoolConfig['ssl'];
}

export function createPostgresPool(
  options: CreatePostgresPoolOptions,
): Pool {
  const connectionString = options.connectionString.trim();

  if (!connectionString) {
    throw new Error(
      'PostgreSQL connection string tidak boleh kosong.',
    );
  }

  const config: PoolConfig = {
    connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis:
      options.connectionTimeoutMillis ?? 5_000,
    application_name:
      options.applicationName ?? 'sarel-assessment',
    ssl: options.ssl,
  };

  return new Pool(config);
}

export function createPostgresDatabase(pool: Pool) {
  return drizzle(pool, {
    schema,
  });
}

export async function assertPostgresConnection(
  pool: Pool,
): Promise<void> {
  const result = await pool.query<{ ok: number }>(
    'select 1::integer as ok',
  );

  if (result.rows[0]?.ok !== 1) {
    throw new Error(
      'PostgreSQL health check menghasilkan respons yang tidak valid.',
    );
  }
}

export async function closePostgresPool(
  pool: Pool,
): Promise<void> {
  await pool.end();
}

export type PostgresPool = Pool;

export type PostgresDatabase = ReturnType<
  typeof createPostgresDatabase
>;
