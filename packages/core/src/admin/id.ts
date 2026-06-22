import { base64UrlEncode, randomBytes } from '../auth/crypto-utils';

// ID aplikasi (bukan auto-increment) agar portable lintas database.
export function generateId(prefix: string): string {
  return `${prefix}_${base64UrlEncode(randomBytes(12))}`;
}
