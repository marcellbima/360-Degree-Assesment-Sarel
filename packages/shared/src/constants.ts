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
