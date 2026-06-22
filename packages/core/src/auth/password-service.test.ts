import { describe, expect, it } from 'vitest';
import { PasswordService } from './password-service';

// Iterasi rendah agar test cepat; bukan nilai produksi.
const svc = new PasswordService('pepper-test', 10_000);

describe('PasswordService', () => {
  it('hash menghasilkan format berversi pbkdf2-sha256$v1', async () => {
    const hash = await svc.hash('Rahasia123');
    const parts = hash.split('$');
    expect(parts[0]).toBe('pbkdf2-sha256');
    expect(parts[1]).toBe('v1');
    expect(parts).toHaveLength(5);
  });

  it('verify menerima password yang benar', async () => {
    const hash = await svc.hash('Rahasia123');
    expect(await svc.verify('Rahasia123', hash)).toBe(true);
  });

  it('verify menolak password yang salah', async () => {
    const hash = await svc.hash('Rahasia123');
    expect(await svc.verify('Salah999', hash)).toBe(false);
  });

  it('salt acak membuat dua hash berbeda untuk password sama', async () => {
    const a = await svc.hash('Rahasia123');
    const b = await svc.hash('Rahasia123');
    expect(a).not.toBe(b);
  });

  it('pepper yang berbeda tidak dapat memverifikasi hash', async () => {
    const hash = await svc.hash('Rahasia123');
    const other = new PasswordService('pepper-lain', 10_000);
    expect(await other.verify('Rahasia123', hash)).toBe(false);
  });
});
