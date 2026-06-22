// Data session yang disimpan. Hanya hash token yang pernah dipersist,
// bukan token mentah.
export interface NewSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface SessionRecord extends NewSession {
  revokedAt: string | null;
}

export interface SessionRepositoryPort {
  create(session: NewSession): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  revokeByTokenHash(tokenHash: string, revokedAt: string): Promise<void>;
}
