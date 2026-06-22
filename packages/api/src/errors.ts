import type { Context } from 'hono';
import { AppError, type ApiErrorResponse, type ErrorCode } from '@sarel/shared';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

// Mengubah error apa pun menjadi response JSON yang konsisten.
// Tidak pernah membocorkan stack trace ke client.
export function formatError(err: unknown, c: Context): Response {
  const requestId = c.get('requestId') as string | undefined;

  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
      ...(requestId ? { requestId } : {}),
    };
    return c.json(body, contentStatus(err.httpStatus));
  }

  const body: ApiErrorResponse = {
    code: 'INTERNAL_ERROR',
    message: 'Terjadi kesalahan. Silakan coba kembali.',
    ...(requestId ? { requestId } : {}),
  };
  return c.json(body, 500);
}

export { STATUS_BY_CODE };

// Hono mengetik status sebagai union; cast aman ke ContentfulStatusCode.
function contentStatus(status: number): 400 | 401 | 403 | 404 | 409 | 429 | 500 {
  switch (status) {
    case 400:
    case 401:
    case 403:
    case 404:
    case 409:
    case 429:
      return status;
    default:
      return 500;
  }
}
