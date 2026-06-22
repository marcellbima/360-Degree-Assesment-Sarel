import { base64UrlDecode, base64UrlEncode, randomBytes, timingSafeEqual } from './crypto-utils';

// Format hash berversi agar dapat dimigrasikan:
// pbkdf2-sha256$v1$<iterations>$<saltBase64Url>$<hashBase64Url>
const HASH_ALGO = 'pbkdf2-sha256';
const HASH_VERSION = 'v1';
const SALT_BYTES = 16;
const DERIVED_BITS = 256;

interface ParsedHash {
  iterations: number;
  salt: Uint8Array<ArrayBuffer>;
  hash: Uint8Array<ArrayBuffer>;
}

async function deriveBits(
  password: string,
  pepper: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const material = new TextEncoder().encode(`${password}${pepper}`);
  const key = await crypto.subtle.importKey('raw', material, 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    DERIVED_BITS,
  );
  return new Uint8Array(derived);
}

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split('$');
  if (parts.length !== 5) {
    return null;
  }
  const [algo, version, iterationsRaw, saltRaw, hashRaw] = parts;
  if (algo !== HASH_ALGO || version !== HASH_VERSION) {
    return null;
  }
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return null;
  }
  const salt = base64UrlDecode(saltRaw);
  const hash = base64UrlDecode(hashRaw);
  if (!salt || !hash || salt.length === 0 || hash.length === 0) {
    return null;
  }
  return { iterations, salt, hash };
}

// PASSWORD_PEPPER bersifat server-side dan iteration count dapat dikonfigurasi.
export class PasswordService {
  private readonly pepper: string;
  private readonly iterations: number;

  constructor(pepper: string, iterations: number) {
    this.pepper = pepper;
    this.iterations = iterations;
  }

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derived = await deriveBits(password, this.pepper, salt, this.iterations);
    return [
      HASH_ALGO,
      HASH_VERSION,
      String(this.iterations),
      base64UrlEncode(salt),
      base64UrlEncode(derived),
    ].join('$');
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const parsed = parseHash(stored);
    if (!parsed) {
      return false;
    }
    const derived = await deriveBits(password, this.pepper, parsed.salt, parsed.iterations);
    return timingSafeEqual(derived, parsed.hash);
  }

  // Menyamakan biaya komputasi saat user tidak ditemukan untuk meredam timing attack.
  async fakeVerify(password: string): Promise<void> {
    const salt = randomBytes(SALT_BYTES);
    await deriveBits(password, this.pepper, salt, this.iterations);
  }
}
