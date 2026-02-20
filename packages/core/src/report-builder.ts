// ---------------------------------------------------------------------------
// @shakenbake/core — ReportBuilder
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';

import type {
  BugReport,
  CaptureResult,
  DestinationAdapter,
  DeviceContext,
  ReportInput,
  SubmitResult,
} from './types.js';
import type { PluginRegistry } from './plugin-registry.js';
import { ShakeNbakeError } from './errors.js';

/**
 * Default (empty) DeviceContext used when no collectors are registered.
 */
function emptyDeviceContext(): DeviceContext {
  return {
    platform: { os: 'unknown' },
    device: {},
    screen: { width: 0, height: 0 },
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

/**
 * Orchestrates assembling a complete BugReport from user input,
 * screenshots, optional audio, and automatically collected context.
 */
export class ReportBuilder {
  private readonly registry: PluginRegistry;
  private readonly adapter: DestinationAdapter;

  constructor(registry: PluginRegistry, adapter: DestinationAdapter) {
    this.registry = registry;
    this.adapter = adapter;
  }

  /**
   * Captures a screenshot using the first registered CapturePlugin.
   * Throws if no CapturePlugin is registered.
   */
  async startCapture(): Promise<CaptureResult> {
    const capturePlugin = this.registry.getCapture();
    if (!capturePlugin) {
      throw new ShakeNbakeError(
        'No CapturePlugin registered. Register a capture plugin before calling startCapture().',
        'UNKNOWN',
      );
    }
    return capturePlugin.capture();
  }

  /**
   * Merges context from all registered ContextCollectors into a full
   * DeviceContext (using empty defaults for missing sections).
   */
  async collectContext(): Promise<DeviceContext> {
    const partial = await this.registry.collectContext();
    const base = emptyDeviceContext();
    return {
      platform: { ...base.platform, ...partial.platform },
      device: { ...base.device, ...partial.device },
      screen: { ...base.screen, ...partial.screen },
      network: { ...base.network, ...partial.network },
      battery: { ...base.battery, ...partial.battery },
      locale: { ...base.locale, ...partial.locale },
      app: { ...base.app, ...partial.app },
      accessibility: { ...base.accessibility, ...partial.accessibility },
      performance: { ...base.performance, ...partial.performance },
      navigation: { ...base.navigation, ...partial.navigation },
      console: { ...base.console, ...partial.console },
    };
  }

  /**
   * Builds a full BugReport from user-provided input and collected context.
   * Generates a UUID and ISO 8601 timestamp.
   */
  build(input: ReportInput, context: DeviceContext): BugReport {
    if (!input.title.trim()) {
      throw new ShakeNbakeError(
        'Report title is required.',
        'UNKNOWN',
      );
    }
    if (!input.annotatedScreenshot) {
      throw new ShakeNbakeError(
        'An annotated screenshot is required.',
        'UNKNOWN',
      );
    }

    const report: BugReport = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      title: input.title,
      description: input.description,
      severity: input.severity,
      category: input.category,
      screenshot: {
        annotated: input.annotatedScreenshot,
        original: input.originalScreenshot,
        dimensions: { width: 0, height: 0 }, // Overwritten by caller if known
      },
      context,
    };

    if (input.audio) {
      report.audio = {
        data: input.audio,
        durationMs: 0,
        mimeType: 'audio/webm',
      };
    }

    return report;
  }

  /**
   * Submits a BugReport via the configured DestinationAdapter.
   * Uploads the screenshot first, then creates the issue.
   */
  async submit(report: BugReport): Promise<SubmitResult> {
    // Convert base64 screenshot to a Buffer for upload
    const imageBuffer = Buffer.from(report.screenshot.annotated, 'base64');
    const filename = `shakenbake-${report.id}.png`;

    await this.adapter.uploadImage(imageBuffer, filename);
    return this.adapter.createIssue(report);
  }
}
