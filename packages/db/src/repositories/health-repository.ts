import type { HealthRepositoryPort } from '@sarel/core';

// Implementasi D1 untuk HealthRepositoryPort.
// Menggunakan binding D1Database yang di-inject dari composition root.
export class D1HealthRepository implements HealthRepositoryPort {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async ping(): Promise<boolean> {
    const row = await this.db.prepare('select 1 as ok').first<{ ok: number }>();
    return row?.ok === 1;
  }
}
