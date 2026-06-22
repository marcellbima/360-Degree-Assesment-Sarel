// Catatan percobaan login untuk lockout dan audit.
export interface NewLoginAttempt {
  id: string;
  userId: string | null;
  userIdInput: string;
  success: boolean;
  ipAddress: string;
  userAgent: string | null;
  createdAt: string;
}

// Filter penghitungan kegagalan. since berupa ISO timestamp batas bawah.
export interface FailureQuery {
  since: string;
  userIdInput?: string;
  ipAddress?: string;
}

// Filter penghapusan kegagalan setelah login berhasil.
export interface ClearFailuresQuery {
  userIdInput?: string;
  ipAddress?: string;
}

export interface LoginAttemptRepositoryPort {
  record(attempt: NewLoginAttempt): Promise<void>;
  countRecentFailures(query: FailureQuery): Promise<number>;
  clearFailures(query: ClearFailuresQuery): Promise<void>;
}
