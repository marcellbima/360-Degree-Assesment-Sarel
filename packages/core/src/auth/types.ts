// Principal hasil autentikasi. Tidak memuat token session.
export interface AuthPrincipal {
  id: string;
  userId: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export interface LoginInput {
  userId: string;
  password: string;
  ip: string;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  principal: AuthPrincipal;
}

export interface RequestContext {
  ip: string;
  userAgent?: string | null;
  requestId?: string | null;
}
