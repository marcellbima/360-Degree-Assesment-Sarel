// Representasi minimal user untuk kebutuhan autentikasi.
// Tidak mengekspos seluruh kolom users; hanya yang diperlukan core.
export interface UserRecord {
  id: string;
  userId: string;
  fullName: string;
  passwordHash: string;
  status: string;
}

export interface UserRepositoryPort {
  findByUserId(userId: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  // Mengembalikan kode role (mis. SUPERADMIN) untuk PK user internal.
  findRoleCodes(userId: string): Promise<string[]>;
  // Mengembalikan kode permission efektif untuk PK user internal.
  findPermissionCodes(userId: string): Promise<string[]>;
}
