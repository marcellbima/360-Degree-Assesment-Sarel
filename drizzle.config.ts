import { defineConfig } from 'drizzle-kit';

// Konfigurasi Drizzle Kit untuk dialek SQLite (Cloudflare D1).
// Migration awal pada Phase 2 ditulis manual di migrations/sqlite.
// Generasi otomatis dapat diaktifkan pada fase berikutnya.
export default defineConfig({
  dialect: 'sqlite',
  schema: './packages/db/src/schema/schema.ts',
  out: './migrations/sqlite',
});
