import { describe, it, expect } from 'vitest';
import { redactContext } from '../redact.js';
import type { DeviceContext } from '../types.js';

function makeContext(): Partial<DeviceContext> {
  return {
    platform: { os: 'web', userAgent: 'Mozilla/5.0', browser: 'Chrome 120' },
    app: { url: 'https://example.com/secret?token=abc', pathname: '/secret', title: 'My App' },
    network: { online: true, effectiveType: '4g' },
    console: {
      recentLogs: [{ level: 'info', message: 'hello', timestamp: '2026-01-01T00:00:00Z' }],
      recentErrors: [],
    },
    screen: { width: 1920, height: 1080 },
  };
}

describe('redactContext', () => {
  it('returns context unchanged when no fields specified', () => {
    const ctx = makeContext();
    const result = redactContext(ctx, []);
    expect(result).toEqual(ctx);
  });

  it('removes a top-level section', () => {
    const result = redactContext(makeContext(), ['console']);
    expect(result.console).toBeUndefined();
    expect(result.platform?.os).toBe('web');
  });

  it('removes a nested field', () => {
    const result = redactContext(makeContext(), ['app.url']);
    expect(result.app?.url).toBeUndefined();
    expect(result.app?.pathname).toBe('/secret');
    expect(result.app?.title).toBe('My App');
  });

  it('handles wildcard to clear all fields in a section', () => {
    const result = redactContext(makeContext(), ['network.*']);
    expect(result.network).toEqual({});
  });

  it('handles multiple redaction patterns', () => {
    const result = redactContext(makeContext(), ['app.url', 'console', 'platform.userAgent']);
    expect(result.app?.url).toBeUndefined();
    expect(result.console).toBeUndefined();
    expect(result.platform?.userAgent).toBeUndefined();
    expect(result.platform?.os).toBe('web');
  });

  it('does not mutate the original context', () => {
    const ctx = makeContext();
    redactContext(ctx, ['app.url', 'console']);
    expect(ctx.app?.url).toBe('https://example.com/secret?token=abc');
    expect(ctx.console).toBeDefined();
  });

  it('ignores non-existent fields gracefully', () => {
    const ctx = makeContext();
    const result = redactContext(ctx, ['nonexistent', 'app.nonexistent']);
    expect(result.platform?.os).toBe('web');
    expect(result.app?.url).toBe('https://example.com/secret?token=abc');
  });
});
