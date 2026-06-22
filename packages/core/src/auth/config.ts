// Konfigurasi autentikasi. Seluruh nilai dapat dikonfigurasi.

export interface AuthConfig {
  pbkdf2Iterations: number;
  sessionTtlSeconds: number;
  adminSessionTtlSeconds: number;
  maxFailedAttempts: number;
  lockoutWindowSeconds: number;
  lockoutDurationSeconds: number;
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  pbkdf2Iterations: 100_000,
  sessionTtlSeconds: 86_400,
  adminSessionTtlSeconds: 3_600,
  maxFailedAttempts: 5,
  lockoutWindowSeconds: 900,
  lockoutDurationSeconds: 900,
};

// Batas minimum keamanan aplikasi.
export const MIN_PBKDF2_ITERATIONS = 50_000;
export const MIN_SECRET_LENGTH = 16;

export const VALID_APP_ENVS = ['development', 'test', 'production'] as const;
export type AppEnv = (typeof VALID_APP_ENVS)[number];
