import type { RoleRepositoryPort, RoleRow } from '@sarel/core';
import type { Db } from '../client';
import { roles } from '../schema/schema';

export class D1RoleRepository implements RoleRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async list(): Promise<RoleRow[]> {
    const rows = await this.db.select({ id: roles.id, code: roles.code }).from(roles).all();
    return rows;
  }
}
