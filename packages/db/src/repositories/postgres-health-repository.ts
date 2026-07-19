import type { HealthRepositoryPort } from '@sarel/core';

import type { PostgresPool } from '../postgres-client';

export class PostgresHealthRepository
  implements HealthRepositoryPort
{
  constructor(
    private readonly pool: PostgresPool,
  ) {}

  async ping(): Promise<boolean> {
    const result = await this.pool.query<{ ok: number }>(
      'select 1::integer as ok',
    );

    return result.rows[0]?.ok === 1;
  }
}
