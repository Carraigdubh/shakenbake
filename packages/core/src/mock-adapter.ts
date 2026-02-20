// ---------------------------------------------------------------------------
// @shakenbake/core — MockAdapter (testing/development DestinationAdapter)
// ---------------------------------------------------------------------------

import type { BugReport, DestinationAdapter, SubmitResult } from './types.js';

/**
 * Configuration options for the MockAdapter.
 */
export interface MockAdapterConfig {
  /** Simulated network latency in milliseconds (default: 0). */
  delay?: number;
}

/**
 * A no-op DestinationAdapter that stores submitted reports in memory.
 *
 * Useful for:
 * - Unit and integration tests (assert on submitted reports)
 * - Local development without a real Linear API key
 * - Demo / example apps
 */
export class MockAdapter implements DestinationAdapter {
  readonly name = 'mock';

  private readonly config: MockAdapterConfig;
  private submittedReports: BugReport[] = [];

  constructor(config?: MockAdapterConfig) {
    this.config = config ?? {};
  }

  /**
   * Simulates uploading an image. Logs the filename and size, then returns
   * a fake URL on mock.shakenbake.dev.
   */
  async uploadImage(
    imageData: Buffer | Blob,
    filename: string,
  ): Promise<string> {
    const size =
      imageData instanceof Blob ? imageData.size : imageData.byteLength;

    console.log(
      `[MockAdapter] uploadImage: ${filename} (${size} bytes)`,
    );

    await this.simulateDelay();

    const id = generateUUID();
    return `https://mock.shakenbake.dev/images/${id}.png`;
  }

  /**
   * Simulates creating an issue. Stores the report in memory and logs a
   * summary to the console.
   */
  async createIssue(report: BugReport): Promise<SubmitResult> {
    this.submittedReports.push(report);

    console.log(
      `[MockAdapter] createIssue: "${report.title}" (${report.severity}/${report.category})`,
    );

    await this.simulateDelay();

    const id = generateUUID();
    return {
      url: `https://mock.shakenbake.dev/issues/${id}`,
      id,
      success: true,
    };
  }

  /**
   * Always resolves to `true` -- the mock connection is always healthy.
   */
  async testConnection(): Promise<boolean> {
    await this.simulateDelay();
    return true;
  }

  // ---------- Test helpers ----------

  /**
   * Returns a shallow copy of all reports submitted via `createIssue`.
   */
  getSubmittedReports(): BugReport[] {
    return [...this.submittedReports];
  }

  /**
   * Clears the internal list of submitted reports.
   */
  clearReports(): void {
    this.submittedReports = [];
  }

  // ---------- Internal ----------

  private async simulateDelay(): Promise<void> {
    const ms = this.config.delay;
    if (ms !== undefined && ms > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
  }
}

// ---------------------------------------------------------------------------
// Platform-agnostic UUID generator (works in Node.js AND browsers without
// requiring a `node:crypto` import that breaks bundlers like webpack).
// ---------------------------------------------------------------------------

function generateUUID(): string {
  // globalThis.crypto.randomUUID is available in Node 19+ and all modern browsers.
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for older runtimes.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
