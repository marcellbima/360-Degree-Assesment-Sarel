// Operasi session administratif (Phase 4). Terpisah dari SessionRepositoryPort
// Phase 3 agar kontrak lama tidak berubah.
export interface SessionAdminRepositoryPort {
  // Mencabut seluruh session aktif milik user. Mengembalikan jumlah yang dicabut.
  revokeAllByUserId(userId: string, revokedAt: string): Promise<number>;
}
