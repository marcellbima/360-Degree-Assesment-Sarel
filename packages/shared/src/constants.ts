// Konstanta domain yang dipakai bersama oleh frontend dan backend.

export const ASSESSMENT_TYPE_CODES = ['SELF', 'SUPERIOR', 'PEER', 'SUBORDINATE'] as const;
export type AssessmentTypeCode = (typeof ASSESSMENT_TYPE_CODES)[number];

// Status assignment yang dianggap aktif (lihat partial unique index pada migration).
export const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'AVAILABLE', 'IN_PROGRESS'] as const;
export type ActiveAssignmentStatus = (typeof ACTIVE_ASSIGNMENT_STATUSES)[number];

// Status yang dihitung selesai untuk assessment 360.
export const ASSESSMENT_COMPLETED_STATUSES = ['SUBMITTED'] as const;

// Status yang dihitung selesai untuk quiz.
export const QUIZ_COMPLETED_STATUSES = ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED'] as const;

export const API_PREFIX = '/api';

// Role bawaan untuk RBAC.
export const ROLE_CODES = ['SUPERADMIN', 'ADMIN', 'USER'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

// Permission minimum (referensi PRD bagian 11).
export const PERMISSION_CODES = [
  'user.read',
  'user.create',
  'user.update',
  'user.delete',
  'admin.manage',
  'program.read',
  'program.manage',
  'batch.read',
  'batch.manage',
  'assessment.read',
  'assessment.manage',
  'evaluator.read',
  'evaluator.manage',
  'quiz.read',
  'quiz.manage',
  'monitoring.read',
  'report.read',
  'report.export',
  'attempt.reset',
  'attempt.force_submit',
  'settings.manage',
  'audit.read',
] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

// Nama cookie session. Token asli hanya dikirim melalui cookie ini.
export const SESSION_COOKIE_NAME = 'sarel_session';

// Pesan generik agar tidak membocorkan apakah User ID atau password yang salah.
export const GENERIC_AUTH_ERROR_MESSAGE = 'User ID atau kata sandi tidak valid.';
