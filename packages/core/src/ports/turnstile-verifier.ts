// Verifikasi Cloudflare Turnstile. Disiapkan untuk fase berikutnya.
export interface TurnstileVerifierPort {
  verify(token: string, ip?: string | null): Promise<boolean>;
}
