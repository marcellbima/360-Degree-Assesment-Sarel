import { describe, expect, it } from 'vitest';
import { ConfigError, resolveRuntimeConfig, type RawRuntimeEnv } from './runtime-config';

const VALID: RawRuntimeEnv = {
  APP_ENV: 'production',
  PASSWORD_PEPPER: 'pepper-rahasia-yang-panjang',
  SESSION_SECRET: 'session-secret-yang-panjang',
  PASSWORD_PBKDF2_ITERATIONS: '100000',
  SESSION_TTL_SECONDS: '86400',
  ADMIN_SESSION_TTL_SECONDS: '3600',
};

describe('resolveRuntimeConfig', () => {
  it('konfigurasi valid diterima', () => {
    const config = resolveRuntimeConfig(VALID);
    expect(config.appEnv).toBe('production');
    expect(config.cookieSecure).toBe(true);
    expect(config.pepper).toBe('pepper-rahasia-yang-panjang');
    expect(config.authConfig.sessionTtlSeconds).toBe(86400);
  });

  it('pepper kosong ditolak', () => {
    expect(() => resolveRuntimeConfig({ ...VALID, PASSWORD_PEPPER: '' })).toThrow(ConfigError);
  });

  it('session secret kosong ditolak', () => {
    expect(() => resolveRuntimeConfig({ ...VALID, SESSION_SECRET: undefined })).toThrow(ConfigError);
  });

  it('placeholder ditolak', () => {
    expect(() => resolveRuntimeConfig({ ...VALID, PASSWORD_PEPPER: 'changeme' })).toThrow(ConfigError);
    expect(() => resolveRuntimeConfig({ ...VALID, SESSION_SECRET: 'secret' })).toThrow(ConfigError);
  });

  it('secret terlalu pendek ditolak', () => {
    expect(() => resolveRuntimeConfig({ ...VALID, PASSWORD_PEPPER: 'pendek' })).toThrow(ConfigError);
  });

  it('APP_ENV tidak valid ditolak', () => {
    expect(() => resolveRuntimeConfig({ ...VALID, APP_ENV: 'staging' })).toThrow(ConfigError);
  });

  it('iteration invalid ditolak', () => {
    expect(() => resolveRuntimeConfig({ ...VALID, PASSWORD_PBKDF2_ITERATIONS: '0' })).toThrow(ConfigError);
    expect(() => resolveRuntimeConfig({ ...VALID, PASSWORD_PBKDF2_ITERATIONS: 'abc' })).toThrow(ConfigError);
    // Di bawah batas minimum aplikasi.
    expect(() => resolveRuntimeConfig({ ...VALID, PASSWORD_PBKDF2_ITERATIONS: '1000' })).toThrow(
      ConfigError,
    );
  });

  it('TTL invalid ditolak', () => {
    expect(() => resolveRuntimeConfig({ ...VALID, SESSION_TTL_SECONDS: '-1' })).toThrow(ConfigError);
    expect(() => resolveRuntimeConfig({ ...VALID, ADMIN_SESSION_TTL_SECONDS: 'x' })).toThrow(
      ConfigError,
    );
  });

  it('admin TTL lebih besar dari TTL normal ditolak', () => {
    expect(() =>
      resolveRuntimeConfig({
        ...VALID,
        SESSION_TTL_SECONDS: '3600',
        ADMIN_SESSION_TTL_SECONDS: '7200',
      }),
    ).toThrow(ConfigError);
  });

  it('development tidak mengaktifkan Secure cookie', () => {
    const config = resolveRuntimeConfig({ ...VALID, APP_ENV: 'development' });
    expect(config.cookieSecure).toBe(false);
  });
});
