import type {
  RoleRepositoryPort,
  RoleRow,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import { roles } from '../schema/postgres-schema';

export class PostgresRoleRepository
  implements RoleRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async list(): Promise<RoleRow[]> {
    return await this.db
      .select({
        id: roles.id,
        code: roles.code,
      })
      .from(roles);
  }
}
