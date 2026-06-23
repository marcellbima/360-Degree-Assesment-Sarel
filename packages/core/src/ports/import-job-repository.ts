export interface ImportJobRecord {
  id: string;
  type: string;
  status: string;
  createdBy: string | null;
  programId: string | null;
  fileName: string | null;
  checksum: string | null;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  errorRows: number;
  errorSummary: string | null;
  committedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface NewImportJob {
  id: string;
  type: string;
  status: string;
  createdBy: string;
  programId: string;
  fileName: string | null;
  checksum: string;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  errorRows: number;
  errorSummary: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewImportJobRow {
  id: string;
  rowNumber: number;
  status: string;
  message: string | null;
  normalized: string | null;
  createdAt: string;
}

export interface ImportJobRowRecord {
  id: string;
  importJobId: string;
  rowNumber: number;
  status: string;
  message: string | null;
  normalized: string | null;
}

export interface ImportJobRepositoryPort {
  create(job: NewImportJob, rows: NewImportJobRow[]): Promise<void>;
  findById(id: string): Promise<ImportJobRecord | null>;
  listRows(jobId: string): Promise<ImportJobRowRecord[]>;
  setStatus(
    id: string,
    status: string,
    fields: { committedAt?: string | null; errorSummary?: string | null; updatedAt: string },
  ): Promise<void>;
}
