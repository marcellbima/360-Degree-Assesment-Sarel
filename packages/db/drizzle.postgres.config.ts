import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL wajib tersedia. Jalankan source .env.local sebelum perintah database.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/postgres-schema.ts',
  out: '../../migrations/postgres',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
});
