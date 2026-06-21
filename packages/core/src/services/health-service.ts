import type { HealthResponse } from '@sarel/shared';
import type { HealthRepositoryPort } from '../ports/health-repository';

// Application service untuk health check.
// Menerima port melalui constructor (dependency injection).
export class HealthService {
  private readonly repo: HealthRepositoryPort;

  constructor(repo: HealthRepositoryPort) {
    this.repo = repo;
  }

  async check(): Promise<HealthResponse> {
    let db: HealthResponse['db'] = 'down';
    try {
      db = (await this.repo.ping()) ? 'up' : 'down';
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      timestamp: new Date().toISOString(),
    };
  }
}
