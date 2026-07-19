import { randomUUID } from 'node:crypto';

import { inArray } from 'drizzle-orm';

import {
  closePostgresPool,
  createPostgresDatabase,
  createPostgresPool,
} from '../src/postgres-client';
import { PostgresUserRepository } from '../src/repositories/postgres-user-repository';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../src/schema/postgres-schema';

const connectionString =
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    'DATABASE_URL wajib tersedia.',
  );
}

const suffix = randomUUID().replaceAll('-', '');

const userId = `smoke_user_${suffix}`;
const userCode = `SMOKE_USER_${suffix}`;

const roleId1 = `smoke_role_1_${suffix}`;
const roleId2 = `smoke_role_2_${suffix}`;
const roleCode1 = `SMOKE_ROLE_1_${suffix}`;
const roleCode2 = `SMOKE_ROLE_2_${suffix}`;

const permissionId =
  `smoke_permission_${suffix}`;
const permissionCode =
  `smoke.permission.${suffix}`;

const userRoleId1 =
  `smoke_user_role_1_${suffix}`;
const userRoleId2 =
  `smoke_user_role_2_${suffix}`;

const rolePermissionId1 =
  `smoke_role_permission_1_${suffix}`;
const rolePermissionId2 =
  `smoke_role_permission_2_${suffix}`;

const pool = createPostgresPool({
  connectionString,
  max: 2,
  applicationName:
    'sarel-assessment-user-repository-smoke',
});

const db = createPostgresDatabase(pool);
const repository =
  new PostgresUserRepository(db);

try {
  await db.insert(users).values({
    id: userId,
    userId: userCode,
    fullName: 'Smoke Test User',
    passwordHash: 'smoke-password-hash',
    status: 'ACTIVE',
  });

  await db.insert(roles).values([
    {
      id: roleId1,
      code: roleCode1,
      name: 'Smoke Test Role 1',
    },
    {
      id: roleId2,
      code: roleCode2,
      name: 'Smoke Test Role 2',
    },
  ]);

  await db.insert(permissions).values({
    id: permissionId,
    code: permissionCode,
    description: 'Smoke test permission',
  });

  await db.insert(userRoles).values([
    {
      id: userRoleId1,
      userId,
      roleId: roleId1,
    },
    {
      id: userRoleId2,
      userId,
      roleId: roleId2,
    },
  ]);

  await db.insert(rolePermissions).values([
    {
      id: rolePermissionId1,
      roleId: roleId1,
      permissionId,
    },
    {
      id: rolePermissionId2,
      roleId: roleId2,
      permissionId,
    },
  ]);

  const foundByUserId =
    await repository.findByUserId(userCode);

  if (
    !foundByUserId ||
    foundByUserId.id !== userId ||
    foundByUserId.fullName !==
      'Smoke Test User' ||
    foundByUserId.status !== 'ACTIVE'
  ) {
    throw new Error(
      'findByUserId() tidak mengembalikan user yang diharapkan.',
    );
  }

  const foundById =
    await repository.findById(userId);

  if (
    !foundById ||
    foundById.userId !== userCode
  ) {
    throw new Error(
      'findById() tidak mengembalikan user yang diharapkan.',
    );
  }

  const roleCodes = new Set(
    await repository.findRoleCodes(userId),
  );

  if (
    roleCodes.size !== 2 ||
    !roleCodes.has(roleCode1) ||
    !roleCodes.has(roleCode2)
  ) {
    throw new Error(
      'findRoleCodes() tidak mengembalikan role yang diharapkan.',
    );
  }

  const permissionCodes =
    await repository.findPermissionCodes(userId);

  if (
    permissionCodes.length !== 1 ||
    permissionCodes[0] !== permissionCode
  ) {
    throw new Error(
      'findPermissionCodes() tidak melakukan deduplikasi dengan benar.',
    );
  }

  const missing =
    await repository.findById(
      `missing_${suffix}`,
    );

  if (missing !== null) {
    throw new Error(
      'findById() seharusnya mengembalikan null untuk user yang tidak ada.',
    );
  }

  console.log(
    `User        : ${foundByUserId.userId}`,
  );
  console.log(
    `Roles       : ${[...roleCodes].join(', ')}`,
  );
  console.log(
    `Permissions : ${permissionCodes.join(', ')}`,
  );
  console.log(
    'PostgreSQL user repository berhasil.',
  );
} finally {
  await db
    .delete(rolePermissions)
    .where(
      inArray(rolePermissions.id, [
        rolePermissionId1,
        rolePermissionId2,
      ]),
    );

  await db
    .delete(userRoles)
    .where(
      inArray(userRoles.id, [
        userRoleId1,
        userRoleId2,
      ]),
    );

  await db
    .delete(permissions)
    .where(
      inArray(permissions.id, [
        permissionId,
      ]),
    );

  await db
    .delete(roles)
    .where(
      inArray(roles.id, [
        roleId1,
        roleId2,
      ]),
    );

  await db
    .delete(users)
    .where(inArray(users.id, [userId]));

  await closePostgresPool(pool);
}
