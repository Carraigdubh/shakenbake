// ---------------------------------------------------------------------------
// @shakenbake/linear — GraphQL queries, mutations, and fetch wrapper
// ---------------------------------------------------------------------------

import { ShakeNbakeError } from '@shakenbake/core';

// ---- GraphQL Queries & Mutations ----

export const VIEWER_QUERY = /* GraphQL */ `
  query Viewer {
    viewer {
      id
    }
  }
`;

export const ISSUE_CREATE_MUTATION = /* GraphQL */ `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`;

export const FILE_UPLOAD_MUTATION = /* GraphQL */ `
  mutation FileUpload($size: Int!, $contentType: String!, $filename: String!) {
    fileUpload(size: $size, contentType: $contentType, filename: $filename) {
      success
      uploadFile {
        uploadUrl
        assetUrl
        headers {
          key
          value
        }
      }
    }
  }
`;

// ---- GraphQL Response Types ----

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

export interface ViewerData {
  viewer: { id: string };
}

export interface IssueCreateData {
  issueCreate: {
    success: boolean;
    issue: {
      id: string;
      identifier: string;
      title: string;
      url: string;
    };
  };
}

export interface FileUploadHeader {
  key: string;
  value: string;
}

export interface FileUploadData {
  fileUpload: {
    success: boolean;
    uploadFile: {
      uploadUrl: string;
      assetUrl: string;
      headers: FileUploadHeader[];
    };
  };
}

/**
 * Result of requesting an upload URL from Linear.
 */
export interface UploadUrlResult {
  uploadUrl: string;
  assetUrl: string;
  headers: FileUploadHeader[];
}

/**
 * Request a signed upload URL from Linear's fileUpload mutation.
 *
 * @throws {ShakeNbakeError} on failure
 */
export async function requestUploadUrl(
  apiKey: string,
  apiUrl: string,
  filename: string,
  contentType: string,
  size: number,
): Promise<UploadUrlResult> {
  const data = await linearFetch<FileUploadData>(
    apiKey,
    apiUrl,
    FILE_UPLOAD_MUTATION,
    { size, contentType, filename },
  );

  if (!data.fileUpload.success) {
    throw new ShakeNbakeError(
      'Linear fileUpload mutation returned success=false',
      'UPLOAD_FAILED',
      { retryable: false },
    );
  }

  const { uploadUrl, assetUrl, headers } = data.fileUpload.uploadFile;
  return { uploadUrl, assetUrl, headers };
}

// ---- Fetch Wrapper ----

/**
 * Execute a GraphQL request against the Linear API.
 *
 * Authorization header uses the API key directly (no "Bearer" prefix),
 * matching Linear's expected format.
 *
 * @throws {ShakeNbakeError} with appropriate code on failure
 */
export async function linearFetch<T = unknown>(
  apiKey: string,
  apiUrl: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error: unknown) {
    throw new ShakeNbakeError(
      'Network request to Linear API failed',
      'NETWORK_ERROR',
      { originalError: error },
    );
  }

  // Handle HTTP-level errors
  if (response.status === 401 || response.status === 403) {
    throw new ShakeNbakeError(
      `Linear API authentication failed (HTTP ${String(response.status)})`,
      'AUTH_FAILED',
      { retryable: false },
    );
  }

  if (response.status === 429) {
    throw new ShakeNbakeError(
      'Linear API rate limit exceeded',
      'RATE_LIMITED',
      { retryable: true },
    );
  }

  if (!response.ok) {
    throw new ShakeNbakeError(
      `Linear API request failed (HTTP ${String(response.status)})`,
      'UNKNOWN',
      { retryable: false },
    );
  }

  let json: GraphQLResponse<T>;
  try {
    json = (await response.json()) as GraphQLResponse<T>;
  } catch (error: unknown) {
    throw new ShakeNbakeError(
      'Failed to parse Linear API response',
      'UNKNOWN',
      { originalError: error },
    );
  }

  // Handle GraphQL-level errors
  if (json.errors && json.errors.length > 0) {
    const firstError = json.errors[0];
    const message = firstError?.message ?? 'Unknown GraphQL error';

    // Check if the error indicates rate limiting via extensions.code
    const extensionCode = firstError?.extensions?.['code'];
    if (extensionCode === 'RATELIMITED') {
      throw new ShakeNbakeError(
        `Linear API rate limit exceeded: ${message}`,
        'RATE_LIMITED',
        { retryable: true },
      );
    }

    // Check if the error indicates auth failure
    if (message.toLowerCase().includes('authentication')) {
      throw new ShakeNbakeError(
        `Linear GraphQL error: ${message}`,
        'AUTH_FAILED',
        { retryable: false },
      );
    }

    throw new ShakeNbakeError(
      `Linear GraphQL error: ${message}`,
      'UNKNOWN',
      { retryable: false },
    );
  }

  if (!json.data) {
    throw new ShakeNbakeError(
      'Linear API returned empty response',
      'UNKNOWN',
      { retryable: false },
    );
  }

  return json.data;
}
