export interface RoleRow {
  id: string;
  code: string;
}

export interface RoleRepositoryPort {
  list(): Promise<RoleRow[]>;
}
