export interface DemoWorkspaceStatus {
  loaded: boolean;
  organizationCount: number;
  programCount: number;
  batchCount: number;
}

export interface DemoWorkspaceRepositoryPort {
  status(): Promise<DemoWorkspaceStatus>;

  load(
    actorId: string,
    now: string,
  ): Promise<DemoWorkspaceStatus>;

  clear(): Promise<DemoWorkspaceStatus>;
}
