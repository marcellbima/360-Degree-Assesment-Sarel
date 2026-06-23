// DTO Phase 5. Tidak pernah memuat password hash, token, atau secret.

export interface ParticipantTargetSummary {
  SELF: number;
  SUPERIOR: number;
  PEER: number;
  SUBORDINATE: number;
}

export interface ParticipantDto {
  id: string;
  userId: string; // PK internal users.id
  userCode: string; // users.user_id (User ID login)
  npk: string | null;
  fullName: string;
  email: string | null;
  programId: string;
  programCode: string;
  batchId: string;
  batchCode: string;
  status: string;
  targets?: ParticipantTargetSummary;
  relationCounts?: ParticipantTargetSummary;
}

export interface ParticipantTargetsDto {
  participantId: string;
  targets: ParticipantTargetSummary;
}

export interface EvaluatorRelationDto {
  id: string;
  programId: string;
  assessmentType: string;
  subjectParticipantId: string;
  subjectUserCode: string;
  subjectName: string;
  subjectBatchId: string;
  evaluatorParticipantId: string | null;
  evaluatorUserId: string;
  evaluatorUserCode: string;
  evaluatorName: string;
  evaluatorBatchId: string | null;
  status: string;
}

export interface ImportJobDto {
  id: string;
  type: string;
  status: string;
  programId: string | null;
  fileName: string | null;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  errorRows: number;
  errorSummary: string | null;
  createdAt: string;
  committedAt: string | null;
}

export interface ImportRowResultDto {
  rowNumber: number;
  status: string;
  message: string | null;
}

export interface ImportPreviewResultDto {
  job: ImportJobDto;
  rows: ImportRowResultDto[];
}
