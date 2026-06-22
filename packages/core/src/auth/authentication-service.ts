import type { ClockPort } from '../ports/clock';
import type { SessionRepositoryPort } from '../ports/session-repository';
import type { UserRepositoryPort } from '../ports/user-repository';
import type { SessionService } from './session-service';
import type { AuthPrincipal } from './types';

// Memvalidasi token session menjadi principal. Session expired atau dicabut
// tidak pernah dianggap valid.
export class AuthenticationService {
  private readonly sessions: SessionRepositoryPort;
  private readonly users: UserRepositoryPort;
  private readonly sessionService: SessionService;
  private readonly clock: ClockPort;

  constructor(
    sessions: SessionRepositoryPort,
    users: UserRepositoryPort,
    sessionService: SessionService,
    clock: ClockPort,
  ) {
    this.sessions = sessions;
    this.users = users;
    this.sessionService = sessionService;
    this.clock = clock;
  }

  async authenticate(token: string): Promise<AuthPrincipal | null> {
    if (!token) {
      return null;
    }
    const tokenHash = await this.sessionService.hashToken(token);
    const session = await this.sessions.findByTokenHash(tokenHash);
    if (!session || session.revokedAt) {
      return null;
    }
    if (new Date(session.expiresAt).getTime() <= this.clock.now().getTime()) {
      return null;
    }
    const user = await this.users.findById(session.userId);
    if (!user || user.status !== 'ACTIVE') {
      return null;
    }
    const [roles, permissions] = await Promise.all([
      this.users.findRoleCodes(user.id),
      this.users.findPermissionCodes(user.id),
    ]);
    return {
      id: user.id,
      userId: user.userId,
      fullName: user.fullName,
      roles,
      permissions,
    };
  }
}
