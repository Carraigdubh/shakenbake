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
   * Throws ShakeNbakeError if no CapturePlugin is registered.
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
   *
   * Each collector is wrapped in try/catch in the registry, so a single
   * failing collector does not prevent the others from contributing.
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
   * Generates a UUID via crypto.randomUUID (with Math.random fallback for
   * older runtimes) and an ISO 8601 timestamp.
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

    let id: string;
    try {
      id = randomUUID();
    } catch {
      // Fallback for runtimes without crypto.randomUUID
      id = fallbackUUID();
    }

    const report: BugReport = {
      id,
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
   * Wraps any adapter errors as ShakeNbakeError.
   */
  async submit(report: BugReport): Promise<SubmitResult> {
    try {
      // Convert base64 screenshot to a Buffer for upload
      const imageBuffer = Buffer.from(report.screenshot.annotated, 'base64');
      const filename = `shakenbake-${report.id}.png`;

      await this.adapter.uploadImage(imageBuffer, filename);
      return await this.adapter.createIssue(report);
    } catch (error: unknown) {
      if (error instanceof ShakeNbakeError) {
        throw error;
      }
      throw new ShakeNbakeError(
        error instanceof Error ? error.message : 'Failed to submit report',
        'UPLOAD_FAILED',
        { originalError: error },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Fallback UUID generator for runtimes without crypto.randomUUID
// ---------------------------------------------------------------------------

function fallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}
