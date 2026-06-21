// Error codes dan kontrak error response bersama.

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: number,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.fieldErrors = fieldErrors;
  }
}
