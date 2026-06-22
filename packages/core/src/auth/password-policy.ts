export const MIN_PASSWORD_LENGTH = 8;

// Daftar password lemah/placeholder yang harus ditolak.
const WEAK_PASSWORDS = new Set([
  'password',
  'changeme',
  'admin',
  'superadmin',
  '12345678',
  'rahasia',
  'qwerty',
  '11111111',
]);

// Mengembalikan pesan error bila password lemah, atau null bila cukup kuat.
export function validatePasswordStrength(password: string): string | null {
  if (password.trim().length === 0) {
    return 'Password tidak boleh kosong.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return 'Password terlalu lemah atau merupakan placeholder.';
  }
  return null;
}
