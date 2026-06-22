import {
  DEFAULT_AUTH_CONFIG,
  MIN_PBKDF2_ITERATIONS,
  MIN_SECRET_LENGTH,
  VALID_APP_ENVS,
  type AppEnv,
  type AuthConfig,
} from './config';

// Error konfigurasi yang jelas dan dapat dibedakan dari error lain.
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface RawRuntimeEnv {
  APP_ENV?: string;
  PASSWORD_PEPPER?: string;
  SESSION_SECRET?: string;
  PASSWORD_PBKDF2_ITERATIONS?: string;
  SESSION_TTL_SECONDS?: string;
  ADMIN_SESSION_TTL_SECONDS?: string;
}

export interface RuntimeConfig {
  appEnv: AppEnv;
  cookieSecure: boolean;
  pepper: string;
  sessionSecret: string;
  authConfig: AuthConfig;
}

// Nilai placeholder yang umum dipakai dan harus ditolak.
const PLACEHOLDER_SECRETS = new Set([
  'changeme',
  'change-me',
  'placeholder',
  'secret',
  'password',
  'pepper',
  'session_secret',
  'sessionsecret',
  'your-secret',
  'example',
  'test',
  'todo',
  'xxxxxxxxxxxxxxxx',
]);

function requireSecret(name: string, value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new ConfigError(`${name} wajib diisi dan tidak boleh kosong.`);
  }
  const trimmed = value.trim();
  if (PLACEHOLDER_SECRETS.has(trimmed.toLowerCase())) {
    throw new ConfigError(`${name} tidak boleh berupa placeholder.`);
  }
  if (trimmed.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(`${name} minimal ${MIN_SECRET_LENGTH} karakter.`);
  }
  return trimmed;
}

function parsePositiveInt(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ConfigError(`${name} harus berupa integer positif.`);
  }
  return parsed;
}

// Validasi fail-fast. Dipanggil saat runtime dependencies dibuat, bukan saat bundling.
export function resolveRuntimeConfig(env: RawRuntimeEnv): RuntimeConfig {
  const appEnvRaw = (env.APP_ENV ?? 'development').trim();
  if (!VALID_APP_ENVS.includes(appEnvRaw as AppEnv)) {
    throw new ConfigError(`APP_ENV harus salah satu dari ${VALID_APP_ENVS.join(', ')}.`);
  }
  const appEnv = appEnvRaw as AppEnv;

  const pepper = requireSecret('PASSWORD_PEPPER', env.PASSWORD_PEPPER);
  const sessionSecret = requireSecret('SESSION_SECRET', env.SESSION_SECRET);

  const pbkdf2Iterations = parsePositiveInt(
    'PASSWORD_PBKDF2_ITERATIONS',
    env.PASSWORD_PBKDF2_ITERATIONS,
    DEFAULT_AUTH_CONFIG.pbkdf2Iterations,
  );
  if (pbkdf2Iterations < MIN_PBKDF2_ITERATIONS) {
    throw new ConfigError(`PASSWORD_PBKDF2_ITERATIONS minimal ${MIN_PBKDF2_ITERATIONS}.`);
  }

  const sessionTtlSeconds = parsePositiveInt(
    'SESSION_TTL_SECONDS',
    env.SESSION_TTL_SECONDS,
    DEFAULT_AUTH_CONFIG.sessionTtlSeconds,
  );
  const adminSessionTtlSeconds = parsePositiveInt(
    'ADMIN_SESSION_TTL_SECONDS',
    env.ADMIN_SESSION_TTL_SECONDS,
    DEFAULT_AUTH_CONFIG.adminSessionTtlSeconds,
  );
  if (adminSessionTtlSeconds > sessionTtlSeconds) {
    throw new ConfigError('ADMIN_SESSION_TTL_SECONDS tidak boleh lebih besar dari SESSION_TTL_SECONDS.');
  }

  return {
    appEnv,
    cookieSecure: appEnv === 'production',
    pepper,
    sessionSecret,
    authConfig: {
      ...DEFAULT_AUTH_CONFIG,
      pbkdf2Iterations,
      sessionTtlSeconds,
      adminSessionTtlSeconds,
    },
  };
}
