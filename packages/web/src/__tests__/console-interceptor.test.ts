import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleInterceptor } from '../context/console-interceptor.js';

describe('ConsoleInterceptor', () => {
  let interceptor: ConsoleInterceptor;

  // Preserve original console methods before each test to avoid cross-contamination.
  let origLog: typeof console.log;
  let origWarn: typeof console.warn;
  let origError: typeof console.error;

  beforeEach(() => {
    origLog = console.log;
    origWarn = console.warn;
    origError = console.error;
    interceptor = new ConsoleInterceptor();
  });

  afterEach(() => {
    interceptor.uninstall();
    // Hard-restore in case uninstall failed.
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
  });

  it('install intercepts console.log', () => {
    interceptor.install();
    console.log('hello world');

    const entries = interceptor.getEntries();
    expect(entries.logs.length).toBe(1);
    expect(entries.logs[0]?.level).toBe('log');
    expect(entries.logs[0]?.message).toBe('hello world');
  });

  it('install intercepts console.warn', () => {
    interceptor.install();
    console.warn('a warning');

    const entries = interceptor.getEntries();
    expect(entries.logs.length).toBe(1);
    expect(entries.logs[0]?.level).toBe('warn');
    expect(entries.logs[0]?.message).toBe('a warning');
  });

  it('install intercepts console.error', () => {
    interceptor.install();
    console.error('an error');

    const entries = interceptor.getEntries();
    expect(entries.errors.length).toBe(1);
    expect(entries.errors[0]?.level).toBe('error');
    expect(entries.errors[0]?.message).toBe('an error');
  });

  it('still calls the original console methods', () => {
    const logSpy = vi.fn();
    console.log = logSpy;

    interceptor = new ConsoleInterceptor();
    interceptor.install();
    console.log('forwarded');

    expect(logSpy).toHaveBeenCalledWith('forwarded');
  });

  it('captures entries with timestamps', () => {
    interceptor.install();
    console.log('timed');

    const entries = interceptor.getEntries();
    expect(entries.logs[0]?.timestamp).toBeDefined();
    // Should be a valid ISO date string.
    expect(new Date(entries.logs[0]!.timestamp).getTime()).not.toBeNaN();
  });

  it('respects maxLogs limit', () => {
    interceptor = new ConsoleInterceptor({ maxLogs: 3 });
    interceptor.install();

    console.log('1');
    console.log('2');
    console.log('3');
    console.log('4');

    const entries = interceptor.getEntries();
    expect(entries.logs.length).toBe(3);
    // The oldest entry should have been evicted.
    expect(entries.logs[0]?.message).toBe('2');
  });

  it('respects maxErrors limit', () => {
    interceptor = new ConsoleInterceptor({ maxErrors: 2 });
    interceptor.install();

    console.error('e1');
    console.error('e2');
    console.error('e3');

    const entries = interceptor.getEntries();
    expect(entries.errors.length).toBe(2);
    expect(entries.errors[0]?.message).toBe('e2');
  });

  it('clear resets all buffers', () => {
    interceptor.install();
    console.log('a');
    console.error('b');

    interceptor.clear();
    const entries = interceptor.getEntries();

    expect(entries.logs.length).toBe(0);
    expect(entries.errors.length).toBe(0);
    expect(entries.rejections.length).toBe(0);
  });

  it('uninstall restores original console methods', () => {
    const originalLog = console.log;
    interceptor.install();
    expect(console.log).not.toBe(originalLog);

    interceptor.uninstall();
    expect(console.log).toBe(originalLog);
  });

  it('uninstall is safe to call when not installed', () => {
    expect(() => interceptor.uninstall()).not.toThrow();
  });

  it('install is idempotent (calling twice does not double-wrap)', () => {
    interceptor.install();
    const wrappedLog = console.log;
    interceptor.install();
    // Should still be the same wrapped function (no double-install).
    expect(console.log).toBe(wrappedLog);
  });

  it('handles non-string arguments in console.log', () => {
    interceptor.install();
    console.log(42, { key: 'val' }, null);

    const entries = interceptor.getEntries();
    expect(entries.logs[0]?.message).toBe('42 {"key":"val"} null');
  });

  it('getEntries returns copies so mutations do not affect internal state', () => {
    interceptor.install();
    console.log('original');

    const entries1 = interceptor.getEntries();
    entries1.logs.push({ level: 'log', message: 'injected', timestamp: '' });

    const entries2 = interceptor.getEntries();
    expect(entries2.logs.length).toBe(1);
  });
});
