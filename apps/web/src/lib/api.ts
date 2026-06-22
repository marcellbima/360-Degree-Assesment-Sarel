import type { MeResponse } from '@sarel/shared';

// Wrapper fetch. credentials: 'include' agar cookie session HttpOnly ikut terkirim.
// Token tidak pernah disimpan di localStorage atau sessionStorage.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? 'Terjadi kesalahan. Silakan coba kembali.');
  }
  return (await res.json()) as T;
}

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
