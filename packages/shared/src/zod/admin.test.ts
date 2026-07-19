import { describe, expect, it } from 'vitest';
import { createUserSchema } from './admin';

const base = {
  fullName: 'Marcel Sarel',
  password: 'Rahasia123',
  roles: ['USER'] as const,
};

describe('createUserSchema', () => {
  it('menerima User ID satu karakter dan mempertahankan huruf besar/kecil', () => {
    const result = createUserSchema.parse({ ...base, userId: 'A' });
    expect(result.userId).toBe('A');
  });

  it('menerima kombinasi huruf dan angka', () => {
    expect(createUserSchema.safeParse({ ...base, userId: 'AbC123' }).success).toBe(true);
  });

  it('menolak spasi dan simbol di dalam User ID', () => {
    expect(createUserSchema.safeParse({ ...base, userId: 'ABC 123' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, userId: 'ABC-123' }).success).toBe(false);
  });
});
