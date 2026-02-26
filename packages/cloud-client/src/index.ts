// ---------------------------------------------------------------------------
// @shakenbake/cloud-client — CloudAdapter (DestinationAdapter for ShakeNbake Cloud)
// ---------------------------------------------------------------------------

import type { DestinationAdapter, BugReport, SubmitResult } from '@shakenbake/core';

/**
 * Configuration for the CloudAdapter.
 */
export interface CloudAdapterConfig {
  /** API key issued by ShakeNbake Cloud (format: snb_app_xxx). */
  apiKey: string;
  /** Convex site URL, e.g. "https://your-project.convex.site". */
  endpoint: string;
}

/**
 * A DestinationAdapter that sends bug reports to the ShakeNbake Cloud
 * ingestion endpoint (POST /api/ingest on the Convex HTTP router).
 *
 * Screenshots and audio are sent inline as base64 strings within the
 * JSON payload. There is no separate file upload step.
 */
export class CloudAdapter implements DestinationAdapter {
  readonly name = 'shakenbake-cloud';

  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(config: CloudAdapterConfig) {
    if (!config.apiKey) {
      throw new Error('CloudAdapter: apiKey is required');
    }
    if (!config.endpoint) {
      throw new Error('CloudAdapter: endpoint is required');
    }
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint.replace(/\/$/, ''); // strip trailing slash
  }

  /**
   * Images are uploaded inline with the report as base64.
   * The cloud endpoint handles storage internally.
   * Returns empty string -- the actual upload happens in createIssue.
   */
  async uploadImage(
    _imageData: Buffer | Blob,
    _filename: string,
  ): Promise<string> {
    return '';
  }

  /**
   * Sends a bug report to the ShakeNbake Cloud ingestion endpoint.
   */
  async createIssue(report: BugReport): Promise<SubmitResult> {
    const payload: Record<string, unknown> = {
      id: report.id,
      title: report.title,
      description: report.description,
      severity: report.severity,
      category: report.category,
      context: report.context,
    };

    if (report.customMetadata) {
      payload.customMetadata = report.customMetadata;
    }

    // Send screenshots as base64 inline
    if (report.screenshot?.annotated) {
      payload.screenshotAnnotated = report.screenshot.annotated;
    }
    if (report.screenshot?.original) {
      payload.screenshotOriginal = report.screenshot.original;
    }

    // Send audio as base64 inline
    if (report.audio?.data) {
      payload.audio = report.audio.data;
    }

    const response = await fetch(`${this.endpoint}/api/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ error: 'Unknown error' })) as Record<string, unknown>;
      const message = errorBody.error ?? errorBody.errors ?? 'Request failed';
      throw new Error(
        `CloudAdapter: ${String(response.status)} - ${typeof message === 'string' ? message : JSON.stringify(message)}`,
      );
    }

    const result = (await response.json()) as {
      success: boolean;
      reportId: string;
      message: string;
    };

    return {
      success: result.success,
      id: result.reportId,
      url: `${this.endpoint}/reports/${result.reportId}`,
    };
  }

  /**
   * Tests connectivity to the Cloud ingestion endpoint by sending an
   * OPTIONS pre-flight request.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/ingest`, {
        method: 'OPTIONS',
      });
      return response.status === 204 || response.ok;
    } catch {
      return false;
    }
  }
}
