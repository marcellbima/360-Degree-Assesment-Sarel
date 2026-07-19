import { z } from 'zod';
import { MAX_PAGE_SIZE } from '../constants';
import { ROLE_CODES } from '../constants';

// Helper umum.
const pageField = z.coerce.number().int().min(1).default(1);
const pageSizeField = z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20);
const searchField = z.string().trim().max(120).optional();
const statusFilter = z.string().trim().max(40).optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const nullableId = z.string().trim().min(1).max(120).nullable().optional();
const roleEnum = z.enum(ROLE_CODES);

// ---- Users ----
export const userListQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  search: searchField,
  status: statusFilter,
  role: roleEnum.optional(),
  sortBy: z.enum(['userId', 'fullName', 'createdAt', 'status']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const createUserSchema = z.object({
  userId: z.string().trim().min(1, 'User ID wajib diisi.').max(120).regex(/^[A-Za-z0-9]+$/, 'User ID hanya boleh berisi huruf dan angka.'),
  fullName: z.string().trim().min(1, 'Nama wajib diisi.').max(200),
  password: z.string().min(1, 'Password wajib diisi.').max(200),
  npk: optionalText(60),
  email: z.string().trim().email('Email tidak valid.').max(200).optional(),
  phone: optionalText(40),
  position: optionalText(120),
  unit: optionalText(120),
  division: optionalText(120),
  organizationId: optionalText(120),
  roles: z.array(roleEnum).min(1).max(4).optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    npk: optionalText(60),
    email: z.string().trim().email('Email tidak valid.').max(200).optional(),
    phone: optionalText(40),
    position: optionalText(120),
    unit: optionalText(120),
    division: optionalText(120),
    organizationId: optionalText(120),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const setUserRolesSchema = z.object({
  roles: z.array(roleEnum).min(1, 'Minimal satu role.').max(4),
});
export type SetUserRolesInput = z.infer<typeof setUserRolesSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(1, 'Password wajib diisi.').max(200),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---- Organizations ----
export const organizationListQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  search: searchField,
  status: statusFilter,
});
export const createOrganizationSchema = z.object({
  code: z.string().trim().min(1, 'Kode wajib diisi.').max(60),
  name: z.string().trim().min(1, 'Nama wajib diisi.').max(200),
});
export const updateOrganizationSchema = z
  .object({
    code: z.string().trim().min(1).max(60).optional(),
    name: z.string().trim().min(1).max(200).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });

// ---- Programs ----
export const programListQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  search: searchField,
  status: statusFilter,
  organizationId: optionalText(120),
});
export const createProgramSchema = z.object({
  code: z.string().trim().min(1, 'Kode wajib diisi.').max(60),
  name: z.string().trim().min(1, 'Nama wajib diisi.').max(200),
  description: optionalText(2000),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  startDate: optionalText(40),
  endDate: optionalText(40),
  organizationId: optionalText(120),
});
export const updateProgramSchema = z
  .object({
    code: z.string().trim().min(1).max(60).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: optionalText(2000),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    startDate: optionalText(40),
    endDate: optionalText(40),
    organizationId: optionalText(120),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });

// ---- Batches ----
export const batchListQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  search: searchField,
  status: statusFilter,
  programId: optionalText(120),
});
export const createBatchSchema = z.object({
  programId: z.string().trim().min(1, 'Program wajib diisi.').max(120),
  code: z.string().trim().min(1, 'Kode wajib diisi.').max(60),
  name: z.string().trim().min(1, 'Nama wajib diisi.').max(200),
  description: optionalText(2000),
  orderIndex: z.coerce.number().int().min(0).max(100000).optional(),
  startDate: optionalText(40),
  endDate: optionalText(40),
});
export const updateBatchSchema = z
  .object({
    code: z.string().trim().min(1).max(60).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: optionalText(2000),
    orderIndex: z.coerce.number().int().min(0).max(100000).optional(),
    startDate: optionalText(40),
    endDate: optionalText(40),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });

// ---- Admin scopes ----
export const scopeRowSchema = z.object({
  organizationId: nullableId,
  programId: nullableId,
  batchId: nullableId,
});
export const putScopesSchema = z.object({
  scopes: z.array(scopeRowSchema).max(100),
});
export type PutScopesInput = z.infer<typeof putScopesSchema>;
