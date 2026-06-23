export interface AssessmentTypeRow {
  id: string;
  code: string;
  isSelf: boolean;
}

export interface AssessmentTypeRepositoryPort {
  list(): Promise<AssessmentTypeRow[]>;
}
