export interface ParticipantTargetRow {
  assessmentTypeId: string;
  targetCount: number;
}

export interface NewParticipantTarget {
  id: string;
  programParticipantId: string;
  assessmentTypeId: string;
  targetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantTargetRepositoryPort {
  findByParticipant(participantId: string): Promise<ParticipantTargetRow[]>;
  // Replace-all dalam satu transaksi.
  replace(participantId: string, targets: NewParticipantTarget[]): Promise<void>;
}
