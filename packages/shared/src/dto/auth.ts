// DTO autentikasi. Tidak pernah memuat token session mentah.

export interface MeResponse {
  userId: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}
