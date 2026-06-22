// Baris admin_scopes milik seorang Admin. program/batch/organization nullable,
// tetapi minimal satu wajib terisi (divalidasi pada admin-scope-policy).
export interface AdminScopeRecord {
  id: string;
  adminUserId: string;
  programId: string | null;
  batchId: string | null;
  organizationId: string | null;
}

export interface AdminScopeRepositoryPort {
  findByAdminUserId(adminUserId: string): Promise<AdminScopeRecord[]>;
}
