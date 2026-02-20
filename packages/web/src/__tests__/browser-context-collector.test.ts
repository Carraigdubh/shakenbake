import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserContextCollector } from '../context/collectors.js';
import { ConsoleInterceptor } from '../context/console-interceptor.js';

/**
 * jsdom does not implement `window.matchMedia`.  We provide a minimal stub
 * so the accessibility sub-collector can exercise its code path.
 */
function stubMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('BrowserContextCollector', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name and platform', () => {
    const collector = new BrowserContextCollector();
    expect(collector.name).toBe('browser');
    expect(collector.platform).toBe('web');
  });

  it('collect returns an object with expected top-level keys', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx).toHaveProperty('platform');
    expect(ctx).toHaveProperty('screen');
    expect(ctx).toHaveProperty('network');
    expect(ctx).toHaveProperty('battery');
    expect(ctx).toHaveProperty('locale');
    expect(ctx).toHaveProperty('app');
    expect(ctx).toHaveProperty('accessibility');
    expect(ctx).toHaveProperty('performance');
    expect(ctx).toHaveProperty('console');
  });

  it('platform context contains os and userAgent', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.platform).toBeDefined();
    expect(ctx.platform!.userAgent).toBeDefined();
    expect(typeof ctx.platform!.os).toBe('string');
  });

  it('screen context contains width and height', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.screen).toBeDefined();
    expect(typeof ctx.screen!.width).toBe('number');
    expect(typeof ctx.screen!.height).toBe('number');
  });

  it('screen context includes viewport dimensions', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(typeof ctx.screen!.viewportWidth).toBe('number');
    expect(typeof ctx.screen!.viewportHeight).toBe('number');
  });

  it('network context contains online status', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.network).toBeDefined();
    expect(typeof ctx.network!.online).toBe('boolean');
  });

  it('locale context contains timezone', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.locale).toBeDefined();
    expect(ctx.locale!.timezone).toBeDefined();
    expect(typeof ctx.locale!.timezoneOffset).toBe('number');
  });

  it('app context contains url and pathname', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.app).toBeDefined();
    expect(typeof ctx.app!.url).toBe('string');
    expect(typeof ctx.app!.pathname).toBe('string');
  });

  it('accessibility context contains preferences', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.accessibility).toBeDefined();
    expect(typeof ctx.accessibility!.prefersReducedMotion).toBe('boolean');
    expect(typeof ctx.accessibility!.prefersColorScheme).toBe('string');
  });

  it('performance context is defined', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.performance).toBeDefined();
  });

  it('console context is empty when no interceptor is provided', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    expect(ctx.console).toEqual({});
  });

  it('console context includes intercepted entries when interceptor is provided', async () => {
    const interceptor = new ConsoleInterceptor();
    interceptor.install();

    // Capture some console output.
    console.log('test log');
    console.error('test error');

    const collector = new BrowserContextCollector({ consoleInterceptor: interceptor });
    const ctx = await collector.collect();

    interceptor.uninstall();

    expect(ctx.console).toBeDefined();
    expect(ctx.console!.recentLogs).toBeDefined();
    expect(ctx.console!.recentLogs!.length).toBeGreaterThanOrEqual(1);
    expect(ctx.console!.recentErrors).toBeDefined();
    expect(ctx.console!.recentErrors!.length).toBeGreaterThanOrEqual(1);
  });

  it('does not throw even if a sub-collector fails', async () => {
    // Override navigator.languages to throw, simulating a broken API.
    const originalLanguages = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      'languages',
    );
    Object.defineProperty(Navigator.prototype, 'languages', {
      get() {
        throw new Error('broken');
      },
      configurable: true,
    });

    const collector = new BrowserContextCollector();
    // Should not throw — individual failures are caught.
    const ctx = await collector.collect();
    expect(ctx).toBeDefined();

    // Restore.
    if (originalLanguages) {
      Object.defineProperty(Navigator.prototype, 'languages', originalLanguages);
    }
  });

  it('battery context is empty when getBattery is not available', async () => {
    const collector = new BrowserContextCollector();
    const ctx = await collector.collect();

    // jsdom does not implement getBattery, so it should return an empty object.
    expect(ctx.battery).toEqual({});
  });
});
