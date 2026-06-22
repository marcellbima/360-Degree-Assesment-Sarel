import { z } from 'zod';

// Validasi request login. Tidak membatasi karakter password agar tidak
// membocorkan kebijakan, hanya membatasi panjang yang wajar.
export const loginRequestSchema = z.object({
  userId: z.string().trim().min(1, 'User ID wajib diisi.').max(120, 'User ID terlalu panjang.'),
  password: z.string().min(1, 'Password wajib diisi.').max(200, 'Password terlalu panjang.'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
