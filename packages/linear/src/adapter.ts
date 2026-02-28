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
  private static hasWarnedMissingProjectId = false;

  private readonly config: LinearConfig;
  private readonly apiUrl: string;
  private readonly severityMapping: Record<string, number>;

  constructor(config: LinearConfig) {
    const normalizedApiKey = config.apiKey.trim();
    const normalizedTeamId = config.teamId.trim();
    const normalizedProjectId = config.projectId?.trim();

    if (normalizedApiKey.length === 0) {
      throw new ShakeNbakeError(
        'LinearAdapter requires a non-empty apiKey',
        'UNKNOWN',
        { retryable: false },
      );
    }

    if (normalizedTeamId.length === 0) {
      throw new ShakeNbakeError(
        'LinearAdapter requires a non-empty teamId',
        'UNKNOWN',
        { retryable: false },
      );
    }

    this.config = {
      ...config,
      apiKey: normalizedApiKey,
      teamId: normalizedTeamId,
      ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
    };
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.severityMapping = config.severityMapping ?? DEFAULT_SEVERITY_MAPPING;

    if (!this.config.projectId && !LinearAdapter.hasWarnedMissingProjectId) {
      // eslint-disable-next-line no-console
      console.warn(
        `[ShakeNbake][LinearAdapter] No projectId configured for team "${this.config.teamId}". ` +
          'Linear will assign issues to the team default/backlog project.',
      );
      LinearAdapter.hasWarnedMissingProjectId = true;
    }
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
      const body = toUploadBody(imageData, contentType);

      // Use Linear-provided signed headers as source of truth.
      const putHeaders: Record<string, string> = {};
      for (const header of uploadHeaders) {
        if (isForbiddenSignedHeader(header.key)) continue;
        putHeaders[header.key] = header.value;
      }
      const hasContentTypeHeader = Object.keys(putHeaders).some(
        (k) => k.toLowerCase() === 'content-type',
      );
      if (!hasContentTypeHeader) {
        putHeaders['Content-Type'] = contentType;
      }

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: putHeaders,
        body: body as unknown as BodyInit,
      });

      if (!putResponse.ok) {
        let responseText = '';
        try {
          responseText = await putResponse.text();
        } catch {
          // ignore response body parse failures
        }
        throw new ShakeNbakeError(
          `File upload to Linear storage failed (HTTP ${String(putResponse.status)}): ${responseText || 'no response body'}`,
          'UPLOAD_FAILED',
          { retryable: false },
        );
      }
    } catch (error: unknown) {
      if (error instanceof ShakeNbakeError) {
        throw error;
      }
      throw new ShakeNbakeError(
        `Network error during file upload to Linear storage (${safeErrorMessage(error)})`,
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
    const attachmentUrls: string[] = [];
    const screenshotUploadErrors: string[] = [];

    try {
      annotatedUrl = await this.uploadImage(
        base64ToBuffer(report.screenshot.annotated),
        `screenshot-annotated-${report.id}.png`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      screenshotUploadErrors.push(`annotated: ${msg}`);
      // eslint-disable-next-line no-console
      console.error('[ShakeNbake][LinearAdapter] Annotated screenshot upload failed:', error);
      annotatedUrl = undefined;
    }

    try {
      originalUrl = await this.uploadImage(
        base64ToBuffer(report.screenshot.original),
        `screenshot-original-${report.id}.png`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      screenshotUploadErrors.push(`original: ${msg}`);
      // eslint-disable-next-line no-console
      console.error('[ShakeNbake][LinearAdapter] Original screenshot upload failed:', error);
      originalUrl = undefined;
    }

    if (!annotatedUrl && !originalUrl) {
      throw new ShakeNbakeError(
        'Failed to upload screenshots to Linear. The issue was not created to avoid losing visual context.',
        'UPLOAD_FAILED',
        {
          retryable: true,
          originalError: new Error(screenshotUploadErrors.join(' | ')),
        },
      );
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

    // Upload optional user-selected attachments carried in customMetadata.
    const extraAttachments = Array.isArray(report.customMetadata?.attachments)
      ? (report.customMetadata?.attachments as Array<{
          base64?: string;
          mimeType?: string;
          filename?: string;
        }>)
      : [];
    if (extraAttachments.length > 0) {
      for (let i = 0; i < extraAttachments.length; i += 1) {
        const attachment = extraAttachments[i];
        if (!attachment?.base64) continue;
        try {
          const mimeType = attachment.mimeType || 'image/png';
          const fallbackExt = mimeType.includes('jpeg')
            ? 'jpg'
            : mimeType.includes('webp')
              ? 'webp'
              : 'png';
          const filename =
            attachment.filename ||
            `attachment-${report.id}-${String(i + 1)}.${fallbackExt}`;
          const uploadedUrl = await this.uploadImage(
            base64ToBuffer(attachment.base64),
            filename,
          );
          attachmentUrls.push(uploadedUrl);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            '[ShakeNbake][LinearAdapter] Extra attachment upload failed:',
            error,
          );
        }
      }
    }

    // Build markdown description
    let description = buildIssueDescription(
      report,
      annotatedUrl,
      originalUrl,
      audioUrl,
    );

    if (attachmentUrls.length > 0) {
      const attachmentsMd = attachmentUrls
        .map((url, index) => `![Attachment ${String(index + 1)}](${url})`)
        .join('\n');
      description += `\n\n## Additional Attachments\n\n${attachmentsMd}`;
    }

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

function toUploadBody(
  imageData: Buffer | Blob,
  contentType: string,
): Blob | Uint8Array {
  if (imageData instanceof Blob) return imageData;

  if (isReactNativeRuntime()) {
    // RN fetch handles raw ArrayBuffer more reliably than Blob from ArrayBufferView.
    return new Uint8Array(
      imageData.buffer,
      imageData.byteOffset,
      imageData.byteLength,
    );
  }

  return new Blob([new Uint8Array(imageData)], { type: contentType });
}

function isForbiddenSignedHeader(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    normalized === 'host' ||
    normalized === 'content-length' ||
    normalized === 'connection' ||
    normalized === 'accept-encoding'
  );
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isReactNativeRuntime(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator !== null &&
    'product' in navigator &&
    (navigator as { product?: string }).product === 'ReactNative'
  );
}
