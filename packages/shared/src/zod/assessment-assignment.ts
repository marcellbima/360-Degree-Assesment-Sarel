import { z } from 'zod';

import { MAX_PAGE_SIZE } from '../constants';

const assignmentIdSchema = z.string().trim().min(1, 'ID wajib diisi.').max(120);

const optionalDateTimeSchema = z.string().trim().max(80).nullable().optional();

export const assessmentAssignmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  search: z.string().trim().max(120).optional(),
});

export const assessmentAssignmentTypeSchema = z.enum(['SELF', 'SUPERIOR', 'PEER', 'SUBORDINATE']);

const allActiveSelectionSchema = z.object({
  mode: z.literal('ALL_ACTIVE'),
});

const batchSelectionSchema = z.object({
  mode: z.literal('BATCHES'),
  batchIds: z.array(assignmentIdSchema).max(1_000, 'Maksimal 1.000 batch.'),
  includeWithoutBatch: z.boolean().default(false),
});

const participantSelectionSchema = z.object({
  mode: z.literal('PARTICIPANTS'),
  participantIds: z
    .array(assignmentIdSchema)
    .min(1, 'Pilih minimal satu peserta.')
    .max(10_000, 'Maksimal 10.000 peserta.'),
});

export const assessmentAssignmentSelectionSchema = z
  .discriminatedUnion('mode', [
    allActiveSelectionSchema,
    batchSelectionSchema,
    participantSelectionSchema,
  ])
  .superRefine((selection, context) => {
    if (
      selection.mode === 'BATCHES' &&
      selection.batchIds.length === 0 &&
      !selection.includeWithoutBatch
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['batchIds'],
        message: 'Pilih minimal satu batch atau peserta tanpa batch.',
      });
    }
  });

function parseDateTime(value: string | null | undefined): number | null {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return null;
  }

  return Date.parse(normalized);
}

export const createAssessmentAssignmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nama penugasan wajib diisi.')
      .max(160, 'Nama penugasan maksimal 160 karakter.'),
    publicFormVersionId: assignmentIdSchema,
    assessmentType: assessmentAssignmentTypeSchema,
    selection: assessmentAssignmentSelectionSchema,
    availableFrom: optionalDateTimeSchema,
    dueAt: optionalDateTimeSchema,
  })
  .superRefine((value, context) => {
    const availableFrom = parseDateTime(value.availableFrom);

    const dueAt = parseDateTime(value.dueAt);

    if (availableFrom !== null && !Number.isFinite(availableFrom)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['availableFrom'],
        message: 'Waktu mulai tidak valid.',
      });
    }

    if (dueAt !== null && !Number.isFinite(dueAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueAt'],
        message: 'Batas waktu tidak valid.',
      });
    }

    if (
      availableFrom !== null &&
      dueAt !== null &&
      Number.isFinite(availableFrom) &&
      Number.isFinite(dueAt) &&
      dueAt <= availableFrom
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueAt'],
        message: 'Batas waktu harus setelah waktu mulai.',
      });
    }
  });

export type AssessmentAssignmentListQueryInput = z.infer<
  typeof assessmentAssignmentListQuerySchema
>;

export type AssessmentAssignmentType = z.infer<typeof assessmentAssignmentTypeSchema>;

export type AssessmentAssignmentSelectionInput = z.infer<
  typeof assessmentAssignmentSelectionSchema
>;

export type CreateAssessmentAssignmentRequest = z.infer<typeof createAssessmentAssignmentSchema>;
