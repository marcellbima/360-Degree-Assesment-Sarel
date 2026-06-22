import { describe, expect, it } from 'vitest';
import { validatePasswordStrength } from './password-policy';

describe('validatePasswordStrength', () => {
  it('menerima password yang cukup kuat', () => {
    expect(validatePasswordStrength('Rahasia123')).toBeNull();
  });

  it('menolak password kosong', () => {
    expect(validatePasswordStrength('   ')).not.toBeNull();
  });

  it('menolak password kurang dari 8 karakter', () => {
    expect(validatePasswordStrength('abc12')).not.toBeNull();
  });

  it('menolak password placeholder/lemah', () => {
    expect(validatePasswordStrength('password')).not.toBeNull();
    expect(validatePasswordStrength('superadmin')).not.toBeNull();
  });
});
