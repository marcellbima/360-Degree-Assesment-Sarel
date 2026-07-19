// Lookup massal untuk validasi import (menghindari N+1).
export interface ImportUserRef {
  id: string;
  userCode: string;
  fullName: string;
}
export interface ImportParticipantRef {
  participantId: string;
  userId: string;
  userCode: string;
  batchId: string | null;
  organizationId: string | null;
}

export interface ImportLookupRepositoryPort {
  findUsersByCodes(codes: string[]): Promise<Map<string, ImportUserRef>>;
  findBatchCodes(programId: string, codes: string[]): Promise<Map<string, string>>; // code -> batchId (aktif, milik program)
  findActiveParticipantUserIds(programId: string): Promise<Set<string>>; // users.id yang aktif sebagai participant
  findActiveParticipantsByUserCodes(
    programId: string,
    codes: string[],
  ): Promise<Map<string, ImportParticipantRef>>; // userCode -> participant aktif
  findActiveRelationKeys(programId: string): Promise<Set<string>>; // `${subjectParticipantId}|${evaluatorUserId}|${assessmentTypeId}`
}
