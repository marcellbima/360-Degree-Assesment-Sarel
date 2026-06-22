// Baris admin_scopes milik seorang Admin. program/batch/organization nullable,
// tetapi minimal satu wajib terisi (divalidasi pada admin-scope-policy).
export interface AdminScopeRecord {
  id: string;
  adminUserId: string;
  programId: string | null;
  batchId: string | null;
  organizationId: string | null;
}

export interface NewAdminScope {
  id: string;
  adminUserId: string;
  programId: string | null;
  batchId: string | null;
  organizationId: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface AdminScopeRepositoryPort {
  findByAdminUserId(adminUserId: string): Promise<AdminScopeRecord[]>;
  // Replace-all dalam satu transaksi: hapus seluruh scope lama, masukkan yang baru.
  replaceForAdmin(adminUserId: string, scopes: NewAdminScope[]): Promise<void>;
}
