import { z } from 'zod';
import { MAX_IMPORT_ROWS, MAX_PAGE_SIZE } from '../constants';

const pageField = z.coerce.number().int().min(1).default(1);
const pageSizeField = z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20);
const searchField = z.string().trim().max(120).optional();
const optionalId = z.string().trim().min(1).max(120).optional();
const evaluatorType = z.enum(['SUPERIOR', 'PEER', 'SUBORDINATE']);

// ---- Participants ----
export const participantListQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  search: searchField,
  batchId: optionalId,
  status: z.string().trim().max(40).optional(),
  sortBy: z.enum(['userCode', 'fullName', 'createdAt', 'status']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const createParticipantSchema = z
  .object({
    userId: optionalId, // users.user_id (User ID) ATAU users.id
    userDbId: optionalId,
    batchId: z.string().trim().min(1, 'Batch wajib diisi.').max(120),
  })
  .refine((v) => v.userId || v.userDbId, { message: 'userId atau userDbId wajib diisi.' });

export const updateParticipantSchema = z
  .object({
    batchId: optionalId,
    position: z.string().trim().max(120).optional(),
    unit: z.string().trim().max(120).optional(),
    employeeId: z.string().trim().max(60).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });

// ---- Targets ----
export const putTargetsSchema = z.object({
  targets: z.object({
    SELF: z.coerce.number().int().min(1).max(1).optional(),
    SUPERIOR: z.coerce.number().int().min(0).max(100000).optional(),
    PEER: z.coerce.number().int().min(0).max(100000).optional(),
    SUBORDINATE: z.coerce.number().int().min(0).max(100000).optional(),
  }),
});

// ---- Evaluator relations ----
export const relationListQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  search: searchField,
  assessmentType: evaluatorType.optional(),
  subjectBatchId: optionalId,
  evaluatorBatchId: optionalId,
  status: z.string().trim().max(40).optional(),
  sortBy: z.enum(['assessmentType', 'createdAt', 'status']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const createRelationSchema = z.object({
  subjectParticipantId: z.string().trim().min(1).max(120),
  evaluatorParticipantId: z.string().trim().min(1).max(120),
  assessmentType: evaluatorType,
});

export const updateRelationSchema = z.object({
  assessmentType: evaluatorType,
});

// ---- Imports ----
const participantRowSchema = z.object({
  rowNumber: z.coerce.number().int().min(1),
  userId: z.string().trim().max(120).optional().default(''),
  batchCode: z.string().trim().max(60).optional().default(''),
});
export const participantPreviewSchema = z.object({
  programId: z.string().trim().min(1).max(120),
  fileName: z.string().trim().max(200).optional(),
  rows: z.array(participantRowSchema).max(MAX_IMPORT_ROWS),
});

const evaluatorRowSchema = z.object({
  rowNumber: z.coerce.number().int().min(1),
  subjectUserId: z.string().trim().max(120).optional().default(''),
  evaluatorUserId: z.string().trim().max(120).optional().default(''),
  assessmentType: z.string().trim().max(40).optional().default(''),
});
export const evaluatorPreviewSchema = z.object({
  programId: z.string().trim().min(1).max(120),
  fileName: z.string().trim().max(200).optional(),
  rows: z.array(evaluatorRowSchema).max(MAX_IMPORT_ROWS),
});

export const importJobListQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
  status: z.string().trim().max(40).optional(),
});

export type ParticipantRowInput = z.infer<typeof participantRowSchema>;
export type EvaluatorRowInput = z.infer<typeof evaluatorRowSchema>;
