// ---------------------------------------------------------------------------
// @shakenbake/web — ProxyAdapter
// DestinationAdapter that forwards reports through a server-side proxy,
// keeping API keys (e.g. Linear) off the client bundle.
// ---------------------------------------------------------------------------

import type {
  DestinationAdapter,
  BugReport,
  SubmitResult,
} from '@shakenbake/core';
import { ShakeNbakeError } from '@shakenbake/core';
import type { ErrorCode } from '@shakenbake/core';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ProxyAdapterConfig {
  /** Base URL of the proxy server (no trailing slash). */
  endpoint: string;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Sends bug reports through a server-side proxy endpoint.
 *
 * Routes:
 *  - `POST ${endpoint}/upload`  — upload screenshot (FormData)
 *  - `POST ${endpoint}/issue`   — create issue (JSON body)
 *  - `GET  ${endpoint}/health`  — connectivity check
 *
 * The proxy server is responsible for authenticating with the actual
 * destination (e.g. Linear, GitHub Issues) so that API keys never
 * appear in the client bundle.
 */
export class ProxyAdapter implements DestinationAdapter {
  readonly name = 'proxy';

  private readonly endpoint: string;

  constructor(config: ProxyAdapterConfig) {
    // Strip trailing slash.
    this.endpoint = config.endpoint.replace(/\/+$/, '');
  }

  /**
   * Uploads an image via the proxy.
   *
   * Sends a `POST` to `${endpoint}/upload` with a `FormData` body containing
   * the image file. Expects a JSON response: `{ url: string }`.
   */
  async uploadImage(
    imageData: Buffer | Blob,
    filename: string,
  ): Promise<string> {
    const formData = new FormData();

    // Convert Buffer to Blob if needed (web environment).
    let blob: Blob;
    if (imageData instanceof Blob) {
      blob = imageData;
    } else {
      // Buffer — extract its underlying ArrayBuffer for Blob construction.
      const buf = imageData as { buffer: ArrayBuffer; byteOffset: number; byteLength: number };
      const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      blob = new Blob([arrayBuf], { type: 'image/png' });
    }

    formData.append('file', blob, filename);

    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/upload`, {
        method: 'POST',
        body: formData,
      });
    } catch (err: unknown) {
      throw new ShakeNbakeError(
        'Network error during image upload',
        'NETWORK_ERROR',
        { originalError: err },
      );
    }

    if (!response.ok) {
      throw this.httpError(response.status, 'Image upload failed');
    }

    const json = (await response.json()) as { url?: string };
    if (!json.url) {
      throw new ShakeNbakeError(
        'Proxy did not return an image URL',
        'UPLOAD_FAILED',
      );
    }

    return json.url;
  }

  /**
   * Creates an issue via the proxy.
   *
   * Sends a `POST` to `${endpoint}/issue` with a JSON body containing the
   * full `BugReport`. Expects a JSON response: `{ url: string; id: string }`.
   */
  async createIssue(report: BugReport): Promise<SubmitResult> {
    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (err: unknown) {
      throw new ShakeNbakeError(
        'Network error during issue creation',
        'NETWORK_ERROR',
        { originalError: err },
      );
    }

    if (!response.ok) {
      throw this.httpError(response.status, 'Issue creation failed');
    }

    const json = (await response.json()) as {
      url?: string;
      id?: string;
    };

    return {
      url: json.url ?? '',
      id: json.id ?? '',
      success: true,
    };
  }

  /**
   * Tests connectivity with the proxy by hitting `GET ${endpoint}/health`.
   *
   * Returns `true` if the response status is 2xx, `false` otherwise.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ---- Internal helpers ----

  private httpError(status: number, fallbackMessage: string): ShakeNbakeError {
    let code: ErrorCode;
    let message: string;

    switch (status) {
      case 401:
      case 403:
        code = 'AUTH_FAILED';
        message = 'Authentication failed. Check your API key configuration.';
        break;
      case 429:
        code = 'RATE_LIMITED';
        message = 'Too many requests. Please try again in a moment.';
        break;
      default:
        code = 'UPLOAD_FAILED';
        message = `${fallbackMessage} (HTTP ${String(status)})`;
    }

    return new ShakeNbakeError(message, code);
  }
}
