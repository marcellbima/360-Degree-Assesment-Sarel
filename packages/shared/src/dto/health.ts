// DTO untuk endpoint health.

export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  timestamp: string;
}
