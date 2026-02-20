// ---------------------------------------------------------------------------
// @shakenbake/linear — LinearAdapter implementing DestinationAdapter
// ---------------------------------------------------------------------------

import type {
  DestinationAdapter,
  BugReport,
  SubmitResult,
} from '@shakenbake/core';
import { ShakeNbakeError } from '@shakenbake/core';
import type { LinearConfig } from './types.js';
import {
  DEFAULT_SEVERITY_MAPPING,
  DEFAULT_API_URL,
} from './types.js';
import {
  linearFetch,
  requestUploadUrl,
  VIEWER_QUERY,
  ISSUE_CREATE_MUTATION,
} from './graphql.js';
import type {
  ViewerData,
  IssueCreateData,
} from './graphql.js';
import { buildIssueDescription } from './markdown.js';

/**
 * Linear destination adapter.
 *
 * Creates issues in Linear via the GraphQL API with markdown descriptions,
 * embedded screenshots, and full device context.
 */
export class LinearAdapter implements DestinationAdapter {
  readonly name = 'linear';

  private readonly config: LinearConfig;
  private readonly apiUrl: string;
  private readonly severityMapping: Record<string, number>;

  constructor(config: LinearConfig) {
    this.config = config;
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.severityMapping = config.severityMapping ?? DEFAULT_SEVERITY_MAPPING;
  }

  /**
   * Upload an image to Linear via the two-step file upload flow:
   * 1. Call fileUpload mutation to get a signed upload URL and asset URL
   * 2. PUT the image data to the signed URL with headers from response
   * 3. Return the asset URL for embedding in the issue
   *
   * @throws {ShakeNbakeError} with code UPLOAD_FAILED on failure
   */
  async uploadImage(
    imageData: Buffer | Blob,
    filename: string,
  ): Promise<string> {
    const size =
      imageData instanceof Blob ? imageData.size : imageData.byteLength;

    const contentType = LinearAdapter.detectContentType(filename);

    // Step 1: Request a signed upload URL from Linear
    let uploadUrl: string;
    let assetUrl: string;
    let uploadHeaders: Array<{ key: string; value: string }>;
    try {
      const result = await requestUploadUrl(
        this.config.apiKey,
        this.apiUrl,
        filename,
        contentType,
        size,
      );
      uploadUrl = result.uploadUrl;
      assetUrl = result.assetUrl;
      uploadHeaders = result.headers;
    } catch (error: unknown) {
      if (error instanceof ShakeNbakeError) {
        throw error;
      }
      throw new ShakeNbakeError(
        'Failed to initiate file upload to Linear',
        'UPLOAD_FAILED',
        { originalError: error },
      );
    }

    // Step 2: PUT the image data to the signed URL
    try {
      // Convert Buffer to Blob for fetch body compatibility across environments
      const body: Blob =
        imageData instanceof Blob
          ? imageData
          : new Blob([new Uint8Array(imageData)], { type: contentType });

      // Build headers: Content-Type + Cache-Control + any headers from Linear
      const putHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      };

      // Apply additional headers returned by the fileUpload mutation
      for (const header of uploadHeaders) {
        putHeaders[header.key] = header.value;
      }

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: putHeaders,
        body,
      });

      if (!putResponse.ok) {
        throw new ShakeNbakeError(
          `File upload to Linear storage failed (HTTP ${String(putResponse.status)})`,
          'UPLOAD_FAILED',
          { retryable: false },
        );
      }
    } catch (error: unknown) {
      if (error instanceof ShakeNbakeError) {
        throw error;
      }
      throw new ShakeNbakeError(
        'Network error during file upload to Linear storage',
        'UPLOAD_FAILED',
        { originalError: error },
      );
    }

    return assetUrl;
  }

  /**
   * Detect the content type from a filename extension.
   */
  static detectContentType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.webm')) return 'audio/webm';
    if (lower.endsWith('.m4a')) return 'audio/m4a';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return 'application/octet-stream';
  }

  /**
   * Create a Linear issue from a BugReport.
   *
   * Uploads screenshots, builds a markdown description, and creates the issue
   * via the issueCreate GraphQL mutation.
   *
   * @throws {ShakeNbakeError} with appropriate code on failure
   */
  async createIssue(report: BugReport): Promise<SubmitResult> {
    // Upload screenshots
    let annotatedUrl: string | undefined;
    let originalUrl: string | undefined;
    let audioUrl: string | undefined;

    try {
      annotatedUrl = await this.uploadImage(
        base64ToBuffer(report.screenshot.annotated),
        `screenshot-annotated-${report.id}.png`,
      );
    } catch {
      // Fall back to embedding base64 inline if upload fails
      annotatedUrl = undefined;
    }

    try {
      originalUrl = await this.uploadImage(
        base64ToBuffer(report.screenshot.original),
        `screenshot-original-${report.id}.png`,
      );
    } catch {
      originalUrl = undefined;
    }

    // Upload audio if present
    if (report.audio?.data) {
      try {
        const ext = report.audio.mimeType.includes('webm') ? 'webm' : 'm4a';
        audioUrl = await this.uploadImage(
          base64ToBuffer(report.audio.data),
          `audio-${report.id}.${ext}`,
        );
      } catch {
        audioUrl = undefined;
      }
    }

    // Build markdown description
    const description = buildIssueDescription(
      report,
      annotatedUrl,
      originalUrl,
      audioUrl,
    );

    // Determine priority
    const priority = this.resolvePriority(report.severity);

    // Build label IDs
    const labelIds = this.resolveLabelIds(report.category);

    // Build input
    const input: Record<string, unknown> = {
      title: report.title,
      description,
      teamId: this.config.teamId,
    };

    if (this.config.projectId) {
      input['projectId'] = this.config.projectId;
    }

    if (labelIds.length > 0) {
      input['labelIds'] = labelIds;
    }

    if (this.config.defaultAssigneeId) {
      input['assigneeId'] = this.config.defaultAssigneeId;
    }

    if (priority !== undefined) {
      input['priority'] = priority;
    }

    // Create issue
    const data = await linearFetch<IssueCreateData>(
      this.config.apiKey,
      this.apiUrl,
      ISSUE_CREATE_MUTATION,
      { input },
    );

    if (!data.issueCreate.success) {
      throw new ShakeNbakeError(
        'Linear issue creation returned success=false',
        'UNKNOWN',
        { retryable: false },
      );
    }

    return {
      url: data.issueCreate.issue.url,
      id: data.issueCreate.issue.id,
      success: true,
    };
  }

  /**
   * Test the connection to Linear by querying the authenticated user.
   *
   * @returns true if credentials are valid, false if auth fails
   * @throws {ShakeNbakeError} with NETWORK_ERROR for connectivity issues
   */
  async testConnection(): Promise<boolean> {
    try {
      const data = await linearFetch<ViewerData>(
        this.config.apiKey,
        this.apiUrl,
        VIEWER_QUERY,
      );
      return Boolean(data.viewer?.id);
    } catch (error: unknown) {
      if (error instanceof ShakeNbakeError) {
        if (error.code === 'AUTH_FAILED') {
          return false;
        }
        throw error;
      }
      throw new ShakeNbakeError(
        'Failed to test Linear connection',
        'NETWORK_ERROR',
        { originalError: error },
      );
    }
  }

  /**
   * Resolve the Linear priority from a severity string.
   */
  private resolvePriority(severity: string): number | undefined {
    const mapped = this.severityMapping[severity];
    if (mapped !== undefined) {
      return mapped;
    }
    return this.config.defaultPriority;
  }

  /**
   * Resolve label IDs from default labels + category-based labels.
   */
  private resolveLabelIds(category: string): string[] {
    const ids: string[] = [];

    if (this.config.defaultLabelIds) {
      ids.push(...this.config.defaultLabelIds);
    }

    if (this.config.categoryLabels) {
      const categoryLabel =
        this.config.categoryLabels[category as keyof typeof this.config.categoryLabels];
      if (categoryLabel) {
        ids.push(categoryLabel);
      }
    }

    return ids;
  }
}

/**
 * Convert a base64-encoded string to a Buffer.
 * Strips the data URI prefix if present.
 */
function base64ToBuffer(base64: string): Buffer {
  // Remove data URI prefix if present (e.g., "data:image/png;base64,")
  const commaIndex = base64.indexOf(',');
  const raw = commaIndex >= 0 ? base64.substring(commaIndex + 1) : base64;
  return Buffer.from(raw, 'base64');
}
