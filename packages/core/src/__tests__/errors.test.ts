import { describe, it, expect } from 'vitest';
import {
  ShakeNbakeError,
  ERROR_MESSAGES,
} from '../errors.js';
import type { ErrorCode } from '../errors.js';

describe('ShakeNbakeError', () => {
  it('should create an error with code and message', () => {
    const err = new ShakeNbakeError('test message', 'AUTH_FAILED');
    expect(err.message).toBe('test message');
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.name).toBe('ShakeNbakeError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ShakeNbakeError);
  });

  it('should default retryable to true for NETWORK_ERROR', () => {
    const err = new ShakeNbakeError('offline', 'NETWORK_ERROR');
    expect(err.retryable).toBe(true);
  });

  it('should default retryable to true for RATE_LIMITED', () => {
    const err = new ShakeNbakeError('rate limit', 'RATE_LIMITED');
    expect(err.retryable).toBe(true);
  });

  it('should default retryable to false for AUTH_FAILED', () => {
    const err = new ShakeNbakeError('auth fail', 'AUTH_FAILED');
    expect(err.retryable).toBe(false);
  });

  it('should default retryable to false for UPLOAD_FAILED', () => {
    const err = new ShakeNbakeError('upload fail', 'UPLOAD_FAILED');
    expect(err.retryable).toBe(false);
  });

  it('should default retryable to false for UNKNOWN', () => {
    const err = new ShakeNbakeError('unknown', 'UNKNOWN');
    expect(err.retryable).toBe(false);
  });

  it('should allow overriding retryable via options', () => {
    const err = new ShakeNbakeError('overridden', 'AUTH_FAILED', {
      retryable: true,
    });
    expect(err.retryable).toBe(true);
  });

  it('should store the original error', () => {
    const original = new TypeError('inner');
    const err = new ShakeNbakeError('wrapped', 'UNKNOWN', {
      originalError: original,
    });
    expect(err.originalError).toBe(original);
  });

  it('isRetryable static method returns correct values', () => {
    expect(ShakeNbakeError.isRetryable('NETWORK_ERROR')).toBe(true);
    expect(ShakeNbakeError.isRetryable('RATE_LIMITED')).toBe(true);
    expect(ShakeNbakeError.isRetryable('AUTH_FAILED')).toBe(false);
    expect(ShakeNbakeError.isRetryable('UPLOAD_FAILED')).toBe(false);
    expect(ShakeNbakeError.isRetryable('UNKNOWN')).toBe(false);
  });

  it('messageForCode returns correct messages', () => {
    const codes: ErrorCode[] = [
      'AUTH_FAILED',
      'RATE_LIMITED',
      'UPLOAD_FAILED',
      'NETWORK_ERROR',
      'UNKNOWN',
    ];
    for (const code of codes) {
      expect(ShakeNbakeError.messageForCode(code)).toBe(
        ERROR_MESSAGES[code],
      );
    }
  });
});
