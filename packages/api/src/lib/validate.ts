import type { ZodType } from 'zod';
import { AppError } from '@sarel/shared';

// Memvalidasi input dengan Zod. Melempar AppError VALIDATION_ERROR yang
// dipformat konsisten oleh error formatter.
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new AppError('VALIDATION_ERROR', 'Data tidak valid.', 400, fieldErrors);
  }
  return result.data;
}
