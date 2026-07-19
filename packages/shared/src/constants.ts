// Konstanta domain yang dipakai bersama oleh frontend dan backend.

export const ASSESSMENT_TYPE_CODES = ['SELF', 'SUPERIOR', 'PEER', 'SUBORDINATE'] as const;
export type AssessmentTypeCode = (typeof ASSESSMENT_TYPE_CODES)[number];

// Tipe yang membutuhkan evaluator relation (SELF bersifat implisit).
export const EVALUATOR_ASSESSMENT_TYPES = ['SUPERIOR', 'PEER', 'SUBORDINATE'] as const;
export type EvaluatorAssessmentType = (typeof EVALUATOR_ASSESSMENT_TYPES)[number];

// Import (Phase 5).
export const IMPORT_TYPES = ['PARTICIPANT', 'EVALUATOR'] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

export const IMPORT_JOB_STATUSES = [
  'PREVIEWED',
  'COMMITTING',
  'COMMITTED',
  'FAILED',
  'EXPIRED',
] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const IMPORT_ROW_STATUSES = ['VALID', 'SKIPPED', 'ERROR'] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export const MAX_IMPORT_ROWS = 1000;
// Masa berlaku import job (default terdokumentasi): 24 jam sejak preview.
export const IMPORT_JOB_TTL_SECONDS = 86_400;

// Status assignment yang dianggap aktif (lihat partial unique index pada migration).
export const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'AVAILABLE', 'IN_PROGRESS'] as const;
export type ActiveAssignmentStatus = (typeof ACTIVE_ASSIGNMENT_STATUSES)[number];

// Status yang dihitung selesai untuk assessment 360.
export const ASSESSMENT_COMPLETED_STATUSES = ['SUBMITTED'] as const;

// Status yang dihitung selesai untuk quiz.
export const QUIZ_COMPLETED_STATUSES = ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED'] as const;

export const API_PREFIX = '/api';

// Role bawaan untuk RBAC.
export const ROLE_CODES = ['SUPERADMIN', 'ADMIN', 'EVALUATOR', 'USER'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

// Permission minimum (referensi PRD bagian 11).
export const PERMISSION_CODES = [
  'user.read',
  'user.create',
  'user.update',
  'user.delete',
  'admin.manage',
  'organization.read',
  'organization.manage',
  'program.read',
  'program.manage',
  'batch.read',
  'batch.manage',
  'participant.read',
  'participant.manage',
  'participant.import',
  'assessment.read',
  'assessment.manage',
  'evaluator.read',
  'evaluator.manage',
  'evaluator.import',
  'quiz.read',
  'quiz.manage',
  'monitoring.read',
  'dashboard.evaluator.read',
  'report.read',
  'report.export',
  'attempt.reset',
  'attempt.force_submit',
  'settings.manage',
  'audit.read',
] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

// Pagination administratif (Phase 4).
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Status user untuk aktivasi/deaktivasi.
export const USER_STATUS_ACTIVE = 'ACTIVE';
export const USER_STATUS_INACTIVE = 'INACTIVE';

// Status master data untuk arsip.
export const MASTER_STATUS_ACTIVE = 'ACTIVE';
export const MASTER_STATUS_ARCHIVED = 'ARCHIVED';

// Nama cookie session. Token asli hanya dikirim melalui cookie ini.
export const SESSION_COOKIE_NAME = 'sarel_session';

// Pesan generik agar tidak membocorkan apakah User ID atau password yang salah.
export const GENERIC_AUTH_ERROR_MESSAGE = 'User ID atau kata sandi tidak valid.';
