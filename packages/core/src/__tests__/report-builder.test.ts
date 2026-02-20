import { describe, it, expect, vi } from 'vitest';
import { ReportBuilder } from '../report-builder.js';
import { PluginRegistry } from '../plugin-registry.js';
import { ShakeNbakeError } from '../errors.js';
import type {
  DestinationAdapter,
  BugReport,
  CapturePlugin,
  DeviceContext,
  ReportInput,
} from '../types.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function makeAdapter(): DestinationAdapter {
  return {
    name: 'mock',
    uploadImage: vi.fn().mockResolvedValue('https://cdn.example.com/img.png'),
    createIssue: vi
      .fn()
      .mockResolvedValue({ url: 'https://linear.app/1', id: 'ISS-1', success: true }),
    testConnection: vi.fn().mockResolvedValue(true),
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

function makeInput(): ReportInput {
  return {
    title: 'Button is broken',
    description: 'The submit button does nothing when clicked',
    severity: 'high',
    category: 'bug',
    annotatedScreenshot: 'YW5ub3RhdGVk', // "annotated" in base64
    originalScreenshot: 'b3JpZ2luYWw=', // "original" in base64
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

    it('includes audio when provided', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput();
      input.audio = 'YXVkaW8='; // "audio" in base64

      const report = builder.build(input, ctx);
      expect(report.audio).toBeDefined();
      expect(report.audio?.data).toBe('YXVkaW8=');
    });

    it('throws when title is empty', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput();
      input.title = '   ';

      expect(() => builder.build(input, ctx)).toThrow(ShakeNbakeError);
    });

    it('throws when annotatedScreenshot is missing', () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);
      const ctx = makeDeviceContext();
      const input = makeInput();
      input.annotatedScreenshot = '';

      expect(() => builder.build(input, ctx)).toThrow(ShakeNbakeError);
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
      expect(capture.capture).toHaveBeenCalled();
    });

    it('throws when no CapturePlugin is registered', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      await expect(builder.startCapture()).rejects.toThrow(ShakeNbakeError);
    });
  });

  describe('collectContext()', () => {
    it('returns a full DeviceContext with empty defaults', async () => {
      const registry = new PluginRegistry();
      const adapter = makeAdapter();
      const builder = new ReportBuilder(registry, adapter);

      const ctx = await builder.collectContext();
      expect(ctx.platform.os).toBe('unknown');
      expect(ctx.screen.width).toBe(0);
      expect(ctx.screen.height).toBe(0);
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
  });
});
