import type {
  ClockPort,
} from '../ports/clock';
import type {
  DemoWorkspaceRepositoryPort,
  DemoWorkspaceStatus,
} from '../ports/demo-workspace-repository';
import {
  ADMIN_AUDIT_ACTIONS,
  type AdminAuditWriter,
} from './audit';
import type {
  AdminContext,
} from './types';

export class DemoWorkspaceService {
  constructor(
    private readonly repository:
      DemoWorkspaceRepositoryPort,
    private readonly clock:
      ClockPort,
    private readonly audit:
      AdminAuditWriter,
  ) {}

  async status():
    Promise<DemoWorkspaceStatus> {
    return this.repository.status();
  }

  async load(
    context: AdminContext,
  ): Promise<DemoWorkspaceStatus> {
    const result =
      await this.repository.load(
        context.actor.id,
        this.clock
          .now()
          .toISOString(),
      );

    await this.audit.record(
      ADMIN_AUDIT_ACTIONS
        .DEMO_WORKSPACE_LOADED,
      context,
      'demo_workspace',
      'demo_workspace',
      'Data contoh dimuat.',
    );

    return result;
  }

  async clear(
    context: AdminContext,
  ): Promise<DemoWorkspaceStatus> {
    const result =
      await this.repository.clear();

    await this.audit.record(
      ADMIN_AUDIT_ACTIONS
        .DEMO_WORKSPACE_CLEARED,
      context,
      'demo_workspace',
      'demo_workspace',
      'Data contoh dihapus.',
    );

    return result;
  }
}
