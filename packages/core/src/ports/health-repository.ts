// Port (interface) untuk pengecekan konektivitas penyimpanan.
// Implementasi konkret (mis. D1) berada di packages/db dan di-inject di composition root.
export interface HealthRepositoryPort {
  ping(): Promise<boolean>;
}
