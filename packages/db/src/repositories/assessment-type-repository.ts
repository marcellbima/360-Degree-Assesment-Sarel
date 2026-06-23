import type { AssessmentTypeRepositoryPort, AssessmentTypeRow } from '@sarel/core';
import type { Db } from '../client';
import { assessmentTypes } from '../schema/schema';

export class D1AssessmentTypeRepository implements AssessmentTypeRepositoryPort {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }
  async list(): Promise<AssessmentTypeRow[]> {
    const rows = await this.db
      .select({ id: assessmentTypes.id, code: assessmentTypes.code, isSelf: assessmentTypes.isSelf })
      .from(assessmentTypes)
      .all();
    return rows.map((r) => ({ id: r.id, code: r.code, isSelf: r.isSelf !== 0 }));
  }
}
