import type {
  AdminScopeDto,
  AdminUserDto,
  BatchDto,
  EvaluatorRelationDto,
  ImportJobDto,
  ImportPreviewResultDto,
  MeResponse,
  OrganizationDto,
  Paginated,
  ParticipantDto,
  ParticipantTargetsDto,
  ProgramDto,
} from '@sarel/shared';

export interface DemoWorkspaceStatus {
  loaded: boolean;
  organizationCount: number;
  programCount: number;
  batchCount: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Handler global ketika sesi habis (401) agar UI kembali ke login.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    unauthorizedHandler?.();
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(res.status, body.message ?? 'Terjadi kesalahan. Silakan coba kembali.');
  }
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

type ListParams = Record<string, string | number | undefined>;

export const authApi = {
  login: (userId: string, password: string): Promise<MeResponse> =>
    request<MeResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    }),
  logout: (): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: (): Promise<MeResponse> => request<MeResponse>('/api/auth/me'),
};

const post = (path: string, body?: unknown): Promise<unknown> =>
  request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const adminApi = {
  demoWorkspace: {
    status: () =>
      request<DemoWorkspaceStatus>(
        '/api/admin/demo-workspace/status',
      ),

    load: () =>
      request<DemoWorkspaceStatus>(
        '/api/admin/demo-workspace/load',
        {
          method: 'POST',
        },
      ),

    clear: () =>
      request<DemoWorkspaceStatus>(
        '/api/admin/demo-workspace',
        {
          method: 'DELETE',
        },
      ),
  },

  users: {
    list: (p: ListParams) => request<Paginated<AdminUserDto>>(`/api/admin/users${qs(p)}`),
    create: (body: unknown) =>
      request<AdminUserDto>('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) =>
      request<AdminUserDto>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    setRoles: (id: string, roles: string[]) =>
      request<AdminUserDto>(`/api/admin/users/${id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles }),
      }),
    resetPassword: (id: string, password: string) =>
      post(`/api/admin/users/${id}/reset-password`, { password }) as Promise<AdminUserDto>,
    activate: (id: string) => post(`/api/admin/users/${id}/activate`) as Promise<AdminUserDto>,
    deactivate: (id: string) => post(`/api/admin/users/${id}/deactivate`) as Promise<AdminUserDto>,
    revokeSessions: (id: string) =>
      post(`/api/admin/users/${id}/revoke-sessions`) as Promise<AdminUserDto>,
    getScopes: (id: string) => request<AdminScopeDto[]>(`/api/admin/users/${id}/scopes`),
    putScopes: (id: string, scopes: unknown[]) =>
      request<AdminScopeDto[]>(`/api/admin/users/${id}/scopes`, {
        method: 'PUT',
        body: JSON.stringify({ scopes }),
      }),
  },
  organizations: {
    list: (p: ListParams) => request<Paginated<OrganizationDto>>(`/api/admin/organizations${qs(p)}`),
    create: (body: unknown) =>
      request<OrganizationDto>('/api/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: unknown) =>
      request<OrganizationDto>(`/api/admin/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    archive: (id: string) =>
      post(`/api/admin/organizations/${id}/archive`) as Promise<OrganizationDto>,
    activate: (id: string) =>
      post(`/api/admin/organizations/${id}/activate`) as Promise<OrganizationDto>,
  },
  programs: {
    list: (p: ListParams) => request<Paginated<ProgramDto>>(`/api/admin/programs${qs(p)}`),
    create: (body: unknown) =>
      request<ProgramDto>('/api/admin/programs', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) =>
      request<ProgramDto>(`/api/admin/programs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    archive: (id: string) => post(`/api/admin/programs/${id}/archive`) as Promise<ProgramDto>,
    activate: (id: string) => post(`/api/admin/programs/${id}/activate`) as Promise<ProgramDto>,
  },
  batches: {
    list: (p: ListParams) => request<Paginated<BatchDto>>(`/api/admin/batches${qs(p)}`),
    create: (body: unknown) =>
      request<BatchDto>('/api/admin/batches', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) =>
      request<BatchDto>(`/api/admin/batches/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    archive: (id: string) => post(`/api/admin/batches/${id}/archive`) as Promise<BatchDto>,
    activate: (id: string) => post(`/api/admin/batches/${id}/activate`) as Promise<BatchDto>,
  },
  participants: {
    list: (programId: string, p: ListParams) =>
      request<Paginated<ParticipantDto>>(`/api/admin/programs/${programId}/participants${qs(p)}`),
    create: (programId: string, body: unknown) =>
      request<ParticipantDto>(`/api/admin/programs/${programId}/participants`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (id: string) => request<ParticipantDto>(`/api/admin/participants/${id}`),
    update: (id: string, body: unknown) =>
      request<ParticipantDto>(`/api/admin/participants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    activate: (id: string) => post(`/api/admin/participants/${id}/activate`) as Promise<ParticipantDto>,
    archive: (id: string) => post(`/api/admin/participants/${id}/archive`) as Promise<ParticipantDto>,
    getTargets: (id: string) => request<ParticipantTargetsDto>(`/api/admin/participants/${id}/targets`),
    putTargets: (id: string, targets: Record<string, number>) =>
      request<ParticipantTargetsDto>(`/api/admin/participants/${id}/targets`, {
        method: 'PUT',
        body: JSON.stringify({ targets }),
      }),
  },
  relations: {
    list: (programId: string, p: ListParams) =>
      request<Paginated<EvaluatorRelationDto>>(
        `/api/admin/programs/${programId}/evaluator-relations${qs(p)}`,
      ),
    create: (programId: string, body: unknown) =>
      request<EvaluatorRelationDto>(`/api/admin/programs/${programId}/evaluator-relations`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    activate: (id: string) =>
      post(`/api/admin/evaluator-relations/${id}/activate`) as Promise<EvaluatorRelationDto>,
    archive: (id: string) =>
      post(`/api/admin/evaluator-relations/${id}/archive`) as Promise<EvaluatorRelationDto>,
  },
  imports: {
    previewParticipants: (body: unknown) =>
      request<ImportPreviewResultDto>('/api/admin/imports/participants/preview', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    previewEvaluators: (body: unknown) =>
      request<ImportPreviewResultDto>('/api/admin/imports/evaluators/preview', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getJob: (id: string) => request<ImportPreviewResultDto>(`/api/admin/import-jobs/${id}`),
    commit: (id: string) => post(`/api/admin/import-jobs/${id}/commit`) as Promise<ImportJobDto>,
  },
};

export {
  request as apiRequest,
  qs as apiQueryString,
};
