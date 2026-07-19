import type {
  AssessmentTypeRepositoryPort,
  AssessmentTypeRow,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import { assessmentTypes } from '../schema/postgres-schema';

export class PostgresAssessmentTypeRepository
  implements AssessmentTypeRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async list(): Promise<AssessmentTypeRow[]> {
    return await this.db
      .select({
        id: assessmentTypes.id,
        code: assessmentTypes.code,
        isSelf: assessmentTypes.isSelf,
      })
      .from(assessmentTypes);
  }
}
