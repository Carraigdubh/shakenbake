import { describe, it, expect, vi } from 'vitest';
import { ReportBuilder } from '../report-builder.js';
import { PluginRegistry } from '../plugin-registry.js';
import { ShakeNbakeError } from '../errors.js';
import type {
  DestinationAdapter,
  BugReport,
  CapturePlugin,
  ContextCollector,
  DeviceContext,
  ReportInput,
} from '../types.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function makeAdapter(overrides?: Partial<DestinationAdapter>): DestinationAdapter {
  return {
    name: 'mock',
    uploadImage: vi.fn().mockResolvedValue('https://cdn.example.com/img.png'),
    createIssue: vi
      .fn()
      .mockResolvedValue({ url: 'https://linear.app/1', id: 'ISS-1', success: true }),
    testConnection: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeCapturePlugin(): CapturePlugin {
  return {
    name: 'mock-capture',
    platform: 'universal',
    capture: vi.fn().mockResolvedValue({
      imageData: 'base64screenshot',
      dimensions: { width: 1920, height: 1080 },
      mimeType: 'image/png',
    }),
  };
}

function makeDeviceContext(): DeviceContext {
  return {
    platform: { os: 'web' },
    device: {},
    screen: { width: 1920, height: 1080 },
    network: {},
    battery: {},
    locale: {},
    app: {},
    accessibility: {},
    performance: {},
    navigation: {},
    console: {},
  };
}

function makeInput(overrides?: Partial<ReportInput>): ReportInput {
  return {
    title: 'Button is broken',
    description: 'The submit button does nothing when clicked',
    severity: 'high',
    category: 'bug',
    annotatedScreenshot: 'YW5ub3RhdGVk', // "annotated" in base64
    originalScreenshot: 'b3JpZ2luYWw=', // "original" in base64
    ...overrides,
  };
}

function makeCollector(
  name: string,
  partial: Partial<DeviceContext>,
): ContextCollector {
  return {
    name,
    platform: 'universal',
    collect: vi.fn().mockResolvedValue(partial),
  };
}

describe('ReportBuilder', () => {
  describe('build()', () => {
    it('builds a BugReport with UUID and ISO timestamp', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput();

      const report = builder.build(input, ctx);

      expect(report.id).toMatch(UUID_REGEX);
      expect(report.timestamp).toMatch(ISO_REGEX);
      expect(report.title).toBe('Button is broken');
      expect(report.description).toBe(
        'The submit button does nothing when clicked',
      );
      expect(report.severity).toBe('high');
      expect(report.category).toBe('bug');
      expect(report.screenshot.annotated).toBe('YW5ub3RhdGVk');
      expect(report.screenshot.original).toBe('b3JpZ2luYWw=');
      expect(report.context).toBe(ctx);
    });

    it('generates unique IDs for different reports', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();

      const report1 = builder.build(makeInput(), ctx);
      const report2 = builder.build(makeInput(), ctx);

      expect(report1.id).not.toBe(report2.id);
    });

    it('includes audio when provided', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput({ audio: 'YXVkaW8=' });

      const report = builder.build(input, ctx);
      expect(report.audio).toBeDefined();
      expect(report.audio?.data).toBe('YXVkaW8=');
      expect(report.audio?.mimeType).toBe('audio/webm');
      expect(report.audio?.durationMs).toBe(0);
    });

    it('omits audio when not provided', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput();

      const report = builder.build(input, ctx);
      expect(report.audio).toBeUndefined();
    });

    it('throws ShakeNbakeError when title is empty', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput({ title: '   ' });

      expect(() => builder.build(input, ctx)).toThrow(ShakeNbakeError);
    });

    it('throws ShakeNbakeError when annotatedScreenshot is missing', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput({ annotatedScreenshot: '' });

      expect(() => builder.build(input, ctx)).toThrow(ShakeNbakeError);
    });

    it('includes all input fields in the report', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput({
        title: 'Custom title',
        description: 'Custom description',
        severity: 'critical',
        category: 'crash',
      });

      const report = builder.build(input, ctx);
      expect(report.title).toBe('Custom title');
      expect(report.description).toBe('Custom description');
      expect(report.severity).toBe('critical');
      expect(report.category).toBe('crash');
    });
  });

  describe('startCapture()', () => {
    it('delegates to the registered CapturePlugin', async () => {
      const registry = new PluginRegistry();
      const capture = makeCapturePlugin();
      registry.registerCapture(capture);
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      const result = await builder.startCapture();
      expect(result.imageData).toBe('base64screenshot');
      expect(result.dimensions).toEqual({ width: 1920, height: 1080 });
      expect(capture.capture).toHaveBeenCalled();
    });

    it('throws ShakeNbakeError when no CapturePlugin is registered', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      await expect(builder.startCapture()).rejects.toThrow(ShakeNbakeError);
    });

    it('throws ShakeNbakeError with UNKNOWN code when no capture plugin', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      try {
        await builder.startCapture();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('UNKNOWN');
      }
    });
  });

  describe('collectContext()', () => {
    it('returns a full DeviceContext with empty defaults when no collectors', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      const ctx = await builder.collectContext();
      expect(ctx.platform.os).toBe('unknown');
      expect(ctx.screen.width).toBe(0);
      expect(ctx.screen.height).toBe(0);
    });

    it('merges context from multiple collectors', async () => {
      const registry = new PluginRegistry();
      registry.registerCollector(
        makeCollector('platform', {
          platform: { os: 'ios', osVersion: '17.0' },
        }),
      );
      registry.registerCollector(
        makeCollector('network', {
          network: { isConnected: true, type: 'wifi' },
        }),
      );
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      const ctx = await builder.collectContext();
      expect(ctx.platform.os).toBe('ios');
      expect(ctx.platform.osVersion).toBe('17.0');
      expect(ctx.network.isConnected).toBe(true);
      expect(ctx.network.type).toBe('wifi');
      // Non-collected sections should have defaults
      expect(ctx.device).toEqual({});
      expect(ctx.battery).toEqual({});
    });

    it('handles collector errors gracefully', async () => {
      const registry = new PluginRegistry();
      registry.registerCollector(
        makeCollector('platform', { platform: { os: 'web' } }),
      );
      registry.registerCollector({
        name: 'broken',
        platform: 'universal',
        collect: vi.fn().mockRejectedValue(new Error('boom')),
      });
      registry.registerCollector(
        makeCollector('network', { network: { isConnected: true } }),
      );
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      // Should not throw — broken collector is skipped
      const ctx = await builder.collectContext();
      expect(ctx.platform.os).toBe('web');
      expect(ctx.network.isConnected).toBe(true);
    });
  });

  describe('submit()', () => {
    it('uploads image and creates issue', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      const report: BugReport = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        title: 'Test',
        description: 'Desc',
        severity: 'low',
        category: 'bug',
        screenshot: {
          annotated: 'YW5ub3RhdGVk',
          original: 'b3JpZ2luYWw=',
          dimensions: { width: 800, height: 600 },
        },
        context: makeDeviceContext(),
      };

      const result = await builder.submit(report);
      expect(adapter.uploadImage).toHaveBeenCalled();
      expect(adapter.createIssue).toHaveBeenCalledWith(report);
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://linear.app/1');
    });

    it('calls uploadImage before createIssue', async () => {
      const callOrder: string[] = [];
      const registry = new PluginRegistry();
      const adapter = makeAdapter({
        uploadImage: vi.fn().mockImplementation(async () => {
          callOrder.push('uploadImage');
          return 'url';
        }),
        createIssue: vi.fn().mockImplementation(async () => {
          callOrder.push('createIssue');
          return { url: 'u', id: 'i', success: true };
        }),
      });
      const builder = new ReportBuilder(registry, adapter);

      const report: BugReport = {
        id: 'order-test',
        timestamp: new Date().toISOString(),
        title: 'Test',
        description: 'Desc',
        severity: 'low',
        category: 'bug',
        screenshot: {
          annotated: 'YW5ub3RhdGVk',
          original: 'b3JpZ2luYWw=',
          dimensions: { width: 800, height: 600 },
        },
        context: makeDeviceContext(),
      };

      await builder.submit(report);
      expect(callOrder).toEqual(['uploadImage', 'createIssue']);
    });

    it('wraps non-ShakeNbakeError adapter errors as ShakeNbakeError', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter({
        uploadImage: vi.fn().mockRejectedValue(new Error('network timeout')),
      });
      const builder = new ReportBuilder(registry, adapter);

      const report: BugReport = {
        id: 'error-test',
        timestamp: new Date().toISOString(),
        title: 'Test',
        description: 'Desc',
        severity: 'low',
        category: 'bug',
        screenshot: {
          annotated: 'YW5ub3RhdGVk',
          original: 'b3JpZ2luYWw=',
          dimensions: { width: 800, height: 600 },
        },
        context: makeDeviceContext(),
      };

      try {
        await builder.submit(report);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        const snbErr = err as ShakeNbakeError;
        expect(snbErr.code).toBe('UPLOAD_FAILED');
        expect(snbErr.message).toBe('network timeout');
        expect(snbErr.originalError).toBeInstanceOf(Error);
      }
    });

    it('re-throws ShakeNbakeError without wrapping', async () => {
      const original = new ShakeNbakeError('auth bad', 'AUTH_FAILED');
      const registry = new PluginRegistry();
      const adapter = makeAdapter({
        uploadImage: vi.fn().mockRejectedValue(original),
      });
      const builder = new ReportBuilder(registry, adapter);

      const report: BugReport = {
        id: 'snb-error-test',
        timestamp: new Date().toISOString(),
        title: 'Test',
        description: 'Desc',
        severity: 'low',
        category: 'bug',
        screenshot: {
          annotated: 'YW5ub3RhdGVk',
          original: 'b3JpZ2luYWw=',
          dimensions: { width: 800, height: 600 },
        },
        context: makeDeviceContext(),
      };

      try {
        await builder.submit(report);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBe(original);
        expect((err as ShakeNbakeError).code).toBe('AUTH_FAILED');
      }
    });

    it('wraps createIssue errors as ShakeNbakeError', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter({
        createIssue: vi.fn().mockRejectedValue(new Error('issue creation failed')),
      });
      const builder = new ReportBuilder(registry, adapter);

      const report: BugReport = {
        id: 'create-error-test',
        timestamp: new Date().toISOString(),
        title: 'Test',
        description: 'Desc',
        severity: 'low',
        category: 'bug',
        screenshot: {
          annotated: 'YW5ub3RhdGVk',
          original: 'b3JpZ2luYWw=',
          dimensions: { width: 800, height: 600 },
        },
        context: makeDeviceContext(),
      };

      try {
        await builder.submit(report);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
        expect((err as ShakeNbakeError).message).toBe('issue creation failed');
      }
    });

    it('handles non-Error thrown values in submit', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter({
        uploadImage: vi.fn().mockRejectedValue('string error'),
      });
      const builder = new ReportBuilder(registry, adapter);

      const report: BugReport = {
        id: 'non-error-test',
        timestamp: new Date().toISOString(),
        title: 'Test',
        description: 'Desc',
        severity: 'low',
        category: 'bug',
        screenshot: {
          annotated: 'YW5ub3RhdGVk',
          original: 'b3JpZ2luYWw=',
          dimensions: { width: 800, height: 600 },
        },
        context: makeDeviceContext(),
      };

      try {
        await builder.submit(report);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).message).toBe('Failed to submit report');
        expect((err as ShakeNbakeError).originalError).toBe('string error');
      }
    });
  });
});
