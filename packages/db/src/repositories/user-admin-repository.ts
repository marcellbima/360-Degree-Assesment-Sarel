import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import {
  generateId,
  type AdminScopeRow,
  type AdminUserRow,
  type NewUserRow,
  type ScopeFilter,
  type UserAdminRepositoryPort,
  type UserListFilter,
  type UserPatch,
} from '@sarel/core';
import type { Db } from '../client';
import { programParticipants, roles, userRoles, users } from '../schema/schema';
import { participantScopeMatch } from './scope-sql';

const USER_SELECT = {
  id: users.id,
  userId: users.userId,
  npk: users.npk,
  fullName: users.fullName,
  email: users.email,
  phone: users.phone,
  position: users.position,
  unit: users.unit,
  division: users.division,
  organizationId: users.organizationId,
  status: users.status,
  mustChangePassword: users.mustChangePassword,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

type UserSelectRow = {
  id: string;
  userId: string;
  npk: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  unit: string | null;
  division: string | null;
  organizationId: string | null;
  status: string;
  mustChangePassword: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toRow(r: UserSelectRow): AdminUserRow {
  return { ...r, mustChangePassword: r.mustChangePassword !== 0 };
}

export class D1UserAdminRepository implements UserAdminRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  private scopeExists(scope: ScopeFilter): SQL | undefined {
    if (scope.kind === 'all') {
      return undefined;
    }
    const cond = participantScopeMatch(scope.rows);
    return sql`EXISTS (SELECT 1 FROM program_participants WHERE ${programParticipants.userId} = ${users.id} AND ${cond})`;
  }

  async list(filter: UserListFilter): Promise<{ items: AdminUserRow[]; total: number }> {
    const conds: SQL[] = [];
    const scopeWhere = this.scopeExists(filter.scope);
    if (scopeWhere) conds.push(scopeWhere);
    if (filter.search) {
      const q = `%${filter.search}%`;
      const term = or(like(users.userId, q), like(users.fullName, q));
      if (term) conds.push(term);
    }
    if (filter.status) conds.push(eq(users.status, filter.status));
    if (filter.roleCode) {
      conds.push(
        sql`EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ${users.id} AND r.code = ${filter.roleCode})`,
      );
    }
    const where = conds.length ? and(...conds) : undefined;

    const sortCol = {
      userId: users.userId,
      fullName: users.fullName,
      createdAt: users.createdAt,
      status: users.status,
    }[filter.sortBy];
    const order = filter.sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

    const totalRow = await this.db.select({ value: count() }).from(users).where(where).get();
    const rows = await this.db
      .select(USER_SELECT)
      .from(users)
      .where(where)
      .orderBy(order)
      .limit(filter.limit)
      .offset(filter.offset)
      .all();
    return { items: rows.map(toRow), total: totalRow?.value ?? 0 };
  }

  async findById(id: string): Promise<AdminUserRow | null> {
    const r = await this.db.select(USER_SELECT).from(users).where(eq(users.id, id)).get();
    return r ? toRow(r) : null;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const r = await this.db.select({ id: users.id }).from(users).where(eq(users.userId, userId)).get();
    return r != null;
  }

  async insert(row: NewUserRow, roleIds: string[]): Promise<void> {
    const userInsert = this.db.insert(users).values({
      id: row.id,
      userId: row.userId,
      npk: row.npk,
      fullName: row.fullName,
      passwordHash: row.passwordHash,
      email: row.email,
      phone: row.phone,
      position: row.position,
      unit: row.unit,
      division: row.division,
      organizationId: row.organizationId,
      status: row.status,
      mustChangePassword: row.mustChangePassword ? 1 : 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
    });
    if (roleIds.length === 0) {
      await userInsert.run();
      return;
    }
    const roleInsert = this.db
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ id: generateId('ur'), userId: row.id, roleId })));
    await this.db.batch([userInsert, roleInsert]);
  }

  async update(id: string, patch: UserPatch): Promise<void> {
    const set: Record<string, string | null> = { updatedAt: patch.updatedAt };
    if (patch.fullName !== undefined) set.fullName = patch.fullName;
    if (patch.npk !== undefined) set.npk = patch.npk;
    if (patch.email !== undefined) set.email = patch.email;
    if (patch.phone !== undefined) set.phone = patch.phone;
    if (patch.position !== undefined) set.position = patch.position;
    if (patch.unit !== undefined) set.unit = patch.unit;
    if (patch.division !== undefined) set.division = patch.division;
    if (patch.organizationId !== undefined) set.organizationId = patch.organizationId;
    await this.db.update(users).set(set).where(eq(users.id, id)).run();
  }

  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await this.db.update(users).set({ status, updatedAt }).where(eq(users.id, id)).run();
  }

  async setPasswordHash(id: string, passwordHash: string, updatedAt: string): Promise<void> {
    await this.db.update(users).set({ passwordHash, updatedAt }).where(eq(users.id, id)).run();
  }

  async getRoleCodes(id: string): Promise<string[]> {
    const rows = await this.db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, id))
      .all();
    return rows.map((r) => r.code);
  }

  async getRoleCodesForUsers(ids: string[]): Promise<Record<string, string[]>> {
    if (ids.length === 0) {
      return {};
    }
    const rows = await this.db
      .select({ userId: userRoles.userId, code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(inArray(userRoles.userId, ids))
      .all();
    const out: Record<string, string[]> = {};
    for (const r of rows) {
      (out[r.userId] ??= []).push(r.code);
    }
    return out;
  }

  async replaceRoles(id: string, roleIds: string[]): Promise<void> {
    const del = this.db.delete(userRoles).where(eq(userRoles.userId, id));
    if (roleIds.length === 0) {
      await del.run();
      return;
    }
    const insert = this.db
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ id: generateId('ur'), userId: id, roleId })));
    await this.db.batch([del, insert]);
  }

  async countActiveSuperadmins(): Promise<number> {
    const row = await this.db
      .select({ value: count() })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.status, 'ACTIVE'), eq(roles.code, 'SUPERADMIN')))
      .get();
    return row?.value ?? 0;
  }

  async isUserInScope(targetUserId: string, scopes: AdminScopeRow[]): Promise<boolean> {
    const cond = participantScopeMatch(scopes);
    const row = await this.db
      .select({ value: count() })
      .from(programParticipants)
      .where(and(eq(programParticipants.userId, targetUserId), cond))
      .get();
    return (row?.value ?? 0) > 0;
  }
}
