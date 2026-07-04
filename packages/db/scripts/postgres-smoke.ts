import { sql } from 'drizzle-orm';

import {
  assertPostgresConnection,
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL wajib tersedia.');
}

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName: 'sarel-assessment-smoke-test',
});

const db = createPostgresDatabase(pool);

try {
  await assertPostgresConnection(pool);

  const result = await db.execute(sql`
    select
      current_database() as "currentDatabase",
      current_user as "currentUser"
  `);

  const row = result.rows[0] as
    | {
        currentDatabase: string;
        currentUser: string;
      }
    | undefined;

  if (!row) {
    throw new Error(
      'Query PostgreSQL tidak menghasilkan data.',
    );
  }

  console.log(`Database : ${row.currentDatabase}`);
  console.log(`User     : ${row.currentUser}`);
  console.log('PostgreSQL client factory berhasil.');
} finally {
  await closePostgresPool(pool);
}
