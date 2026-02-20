// ---------------------------------------------------------------------------
// @shakenbake/core — Error types and ShakeNbakeError class
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'UPLOAD_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/**
 * Mapping from error code to a user-facing message.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_FAILED:
    'Unable to submit report. Check your API key configuration.',
  RATE_LIMITED:
    'Too many reports submitted. Please try again in a moment.',
  UPLOAD_FAILED:
    'Screenshot upload failed. The image will be embedded in the issue description as a fallback.',
  NETWORK_ERROR:
    "You're offline. Report saved locally -- it will be submitted when you reconnect.",
  UNKNOWN:
    'An unexpected error occurred while submitting the report.',
};

/** Codes that are safe to auto-retry. */
const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'NETWORK_ERROR',
  'RATE_LIMITED',
]);

export interface ShakeNbakeErrorOptions {
  retryable?: boolean;
  originalError?: unknown;
}

/**
 * Typed error thrown by all ShakeNbake adapters and internal code.
 */
export class ShakeNbakeError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly originalError?: unknown;

  constructor(
    message: string,
    code: ErrorCode,
    options?: ShakeNbakeErrorOptions,
  ) {
    super(message);
    this.name = 'ShakeNbakeError';
    this.code = code;
    this.retryable =
      options?.retryable ?? ShakeNbakeError.isRetryable(code);
    this.originalError = options?.originalError;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ShakeNbakeError.prototype);
  }

  /** Returns true for error codes that are safe to auto-retry. */
  static isRetryable(code: ErrorCode): boolean {
    return RETRYABLE_CODES.has(code);
  }

  /** Returns the default user-facing message for a given error code. */
  static messageForCode(code: ErrorCode): string {
    return ERROR_MESSAGES[code];
  }
}
