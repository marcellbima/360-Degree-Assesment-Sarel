import type { NewParticipant } from './participant-repository';
import type { NewRelation } from './evaluator-relation-repository';

// Commit import secara atomik (D1 batch): seluruh mutation + perubahan status job
// dijalankan bersama. Bila gagal, tidak ada data yang tersimpan dan job tidak COMMITTED.
export interface ImportCommitRepositoryPort {
  commitParticipants(
    jobId: string,
    committedAt: string,
    participants: NewParticipant[],
  ): Promise<void>;
  commitEvaluators(
    jobId: string,
    committedAt: string,
    inserts: NewRelation[],
    reactivateIds: string[],
  ): Promise<void>;
}
