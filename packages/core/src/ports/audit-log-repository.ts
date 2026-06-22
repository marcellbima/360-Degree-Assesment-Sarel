// Entri audit log. requestId mengkorelasikan satu request HTTP.
export interface NewAuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  reason: string | null;
  ipAddress: string;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface AuditLogRepositoryPort {
  record(entry: NewAuditLog): Promise<void>;
}
