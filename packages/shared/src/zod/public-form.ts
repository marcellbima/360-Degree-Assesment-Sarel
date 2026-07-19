import { z } from 'zod';

import { MAX_PAGE_SIZE } from '../constants';

const pageField =
  z.coerce
    .number()
    .int()
    .min(1)
    .default(1);

const pageSizeField =
  z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(20);

const googleSheetsWebhookUrlField =
  z.string()
    .trim()
    .url(
      'URL webhook Google Sheets tidak valid.',
    )
    .max(2000)
    .nullable()
    .optional();

const scheduleField =
  z.string()
    .trim()
    .max(80)
    .nullable()
    .optional();

export const publicFormQuestionTypeSchema =
  z.enum([
    'short_text',
    'paragraph',
    'single_choice',
    'multiple_choice',
    'scale',
    'grid',
    'title_description',
  ]);

export const publicFormQuestionSchema =
  z.object({
    id: z.string()
      .trim()
      .min(1)
      .max(120),

    title: z.string()
      .trim()
      .max(500),

    description: z.string()
      .trim()
      .max(2000),

    type: publicFormQuestionTypeSchema,

    required: z.boolean(),

    showOptionLabels:
      z.boolean().optional(),

    options: z.array(
      z.string()
        .trim()
        .max(500),
    ).max(100),

    scaleMin: z.number()
      .int()
      .min(0)
      .max(10),

    scaleMax: z.number()
      .int()
      .min(1)
      .max(10),

    scaleMinLabel: z.string()
      .trim()
      .max(200),

    scaleMaxLabel: z.string()
      .trim()
      .max(200),

    gridRows: z.array(
      z.string()
        .trim()
        .max(500),
    ).max(100),
  })
    .refine(
      (question) =>
        question.scaleMax >
        question.scaleMin,
      {
        message:
          'Nilai maksimum skala harus lebih besar dari nilai minimum.',
        path: ['scaleMax'],
      },
    );

export const publicFormSectionSchema =
  z.object({
    id: z.string()
      .trim()
      .min(1)
      .max(120),

    title: z.string()
      .trim()
      .max(500),

    description: z.string()
      .trim()
      .max(2000),

    questions: z.array(
      publicFormQuestionSchema,
    ).max(200),
  });

export const publicFormDefinitionSchema =
  z.object({
    title: z.string()
      .trim()
      .min(
        1,
        'Judul formulir wajib diisi.',
      )
      .max(200),

    description: z.string()
      .trim()
      .max(4000),

    sections: z.array(
      publicFormSectionSchema,
    )
      .min(
        1,
        'Minimal terdapat satu bagian formulir.',
      )
      .max(50),
  });

export const publicFormListQuerySchema =
  z.object({
    page: pageField,
    pageSize: pageSizeField,

    search: z.string()
      .trim()
      .max(120)
      .optional(),

    status: z.enum([
      'DRAFT',
      'PUBLISHED',
    ]).optional(),
  });

export const createPublicFormSchema =
  z.object({
    slug: z.string()
      .trim()
      .min(
        1,
        'Slug formulir wajib diisi.',
      )
      .max(100),

    definition:
      publicFormDefinitionSchema,

    googleSheetsEnabled:
      z.boolean().optional(),

    googleSheetsWebhookUrl:
      googleSheetsWebhookUrlField,
  });

export const updatePublicFormDraftSchema =
  z.object({
    slug: z.string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    definition:
      publicFormDefinitionSchema
        .optional(),

    opensAt: scheduleField,
    closesAt: scheduleField,

    googleSheetsEnabled:
      z.boolean().optional(),

    googleSheetsWebhookUrl:
      googleSheetsWebhookUrlField,
  })
    .refine(
      (value) =>
        Object.keys(value).length > 0,
      {
        message:
          'Tidak ada perubahan.',
      },
    );

export const publishPublicFormSchema =
  z.object({
    opensAt: scheduleField,
    closesAt: scheduleField,
  });

export const submitPublicFormSchema =
  z.object({
    respondentName: z.string()
      .trim()
      .max(200)
      .nullable()
      .optional(),

    respondentEmail: z.string()
      .trim()
      .email(
        'Alamat email tidak valid.',
      )
      .max(200)
      .nullable()
      .optional(),

    answers: z.record(
      z.unknown(),
    ),
  });

export type PublicFormDefinitionInput =
  z.infer<
    typeof publicFormDefinitionSchema
  >;

export type PublicFormListQueryInput =
  z.infer<
    typeof publicFormListQuerySchema
  >;

export type CreatePublicFormRequest =
  z.infer<
    typeof createPublicFormSchema
  >;

export type UpdatePublicFormDraftRequest =
  z.infer<
    typeof updatePublicFormDraftSchema
  >;

export type PublishPublicFormRequest =
  z.infer<
    typeof publishPublicFormSchema
  >;

export type SubmitPublicFormRequest =
  z.infer<
    typeof submitPublicFormSchema
  >;
