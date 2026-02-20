import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { ShakeNbakeError } from '@shakenbake/core';
import { LinearAdapter } from '../adapter.js';
import type { LinearConfig } from '../types.js';

// ---- Helpers ----

function makeConfig(overrides?: Partial<LinearConfig>): LinearConfig {
  return {
    apiKey: 'lin_api_test_key',
    teamId: 'team-123',
    ...overrides,
  };
}

/** Create a successful GraphQL JSON response. */
function graphqlResponse<T>(data: T): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Create a successful PUT response. */
function putResponse(): Response {
  return new Response(null, { status: 200 });
}

/** Standard file upload response data with headers. */
function fileUploadData(
  index: number,
  headers: Array<{ key: string; value: string }> = [],
) {
  return {
    fileUpload: {
      success: true,
      uploadFile: {
        uploadUrl: `https://uploads.linear.app/upload-${String(index)}`,
        assetUrl: `https://assets.linear.app/asset-${String(index)}`,
        headers,
      },
    },
  };
}

/** Extract the request init from a fetch mock call. */
function getCallInit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calls: any[][],
  index: number,
): RequestInit {
  const call = calls[index] as [string, RequestInit] | undefined;
  if (!call) throw new Error(`No fetch call at index ${String(index)}`);
  return call[1];
}

/** Extract the URL from a fetch mock call. */
function getCallUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calls: any[][],
  index: number,
): string {
  const call = calls[index] as [string, RequestInit] | undefined;
  if (!call) throw new Error(`No fetch call at index ${String(index)}`);
  return call[0];
}

// ---- Tests ----

describe('uploadImage', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: MockInstance<any>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // == Happy path ==

  describe('successful upload', () => {
    it('calls requestUploadUrl then PUTs to signed URL', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('image-data'), 'test.png');

      // First call is the fileUpload GraphQL mutation
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(getCallUrl(fetchMock.mock.calls, 0)).toBe(
        'https://api.linear.app/graphql',
      );
      // Second call is the PUT to the signed URL
      expect(getCallUrl(fetchMock.mock.calls, 1)).toBe(
        'https://uploads.linear.app/upload-1',
      );
      const putInit = getCallInit(fetchMock.mock.calls, 1);
      expect(putInit.method).toBe('PUT');
    });

    it('returns assetUrl on success', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      const url = await adapter.uploadImage(
        Buffer.from('image-data'),
        'screenshot.png',
      );

      expect(url).toBe('https://assets.linear.app/asset-1');
    });

    it('handles Buffer input correctly', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      const imageBuffer = Buffer.from('test-buffer-data');
      const url = await adapter.uploadImage(imageBuffer, 'test.png');

      expect(url).toBe('https://assets.linear.app/asset-1');

      // Verify the GraphQL mutation received the correct size
      const graphqlInit = getCallInit(fetchMock.mock.calls, 0);
      const body = JSON.parse(graphqlInit.body as string) as {
        variables: { size: number };
      };
      expect(body.variables.size).toBe(imageBuffer.byteLength);
    });

    it('handles Blob input correctly', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      const imageBlob = new Blob(['test-blob-data'], { type: 'image/png' });
      const url = await adapter.uploadImage(imageBlob, 'test.png');

      expect(url).toBe('https://assets.linear.app/asset-1');

      // Verify the GraphQL mutation received the correct size (Blob.size)
      const graphqlInit = getCallInit(fetchMock.mock.calls, 0);
      const body = JSON.parse(graphqlInit.body as string) as {
        variables: { size: number };
      };
      expect(body.variables.size).toBe(imageBlob.size);
    });

    it('applies additional headers from fileUpload response to PUT request', async () => {
      fetchMock.mockResolvedValueOnce(
        graphqlResponse(
          fileUploadData(1, [
            { key: 'x-amz-acl', value: 'public-read' },
            { key: 'x-amz-meta-custom', value: 'linear-upload' },
          ]),
        ),
      );
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'test.png');

      const putInit = getCallInit(fetchMock.mock.calls, 1);
      const headers = putInit.headers as Record<string, string>;
      expect(headers['x-amz-acl']).toBe('public-read');
      expect(headers['x-amz-meta-custom']).toBe('linear-upload');
      expect(headers['Content-Type']).toBe('image/png');
      expect(headers['Cache-Control']).toBe('public, max-age=31536000');
    });
  });

  // == Content type detection ==

  describe('content type detection', () => {
    it('detects image/png for .png files', () => {
      expect(LinearAdapter.detectContentType('screenshot.png')).toBe(
        'image/png',
      );
    });

    it('detects image/jpeg for .jpg files', () => {
      expect(LinearAdapter.detectContentType('photo.jpg')).toBe(
        'image/jpeg',
      );
    });

    it('detects image/jpeg for .jpeg files', () => {
      expect(LinearAdapter.detectContentType('photo.jpeg')).toBe(
        'image/jpeg',
      );
    });

    it('detects audio/webm for .webm files', () => {
      expect(LinearAdapter.detectContentType('audio.webm')).toBe(
        'audio/webm',
      );
    });

    it('detects audio/m4a for .m4a files', () => {
      expect(LinearAdapter.detectContentType('recording.m4a')).toBe(
        'audio/m4a',
      );
    });

    it('detects image/gif for .gif files', () => {
      expect(LinearAdapter.detectContentType('animation.gif')).toBe(
        'image/gif',
      );
    });

    it('detects image/webp for .webp files', () => {
      expect(LinearAdapter.detectContentType('photo.webp')).toBe(
        'image/webp',
      );
    });

    it('falls back to application/octet-stream for unknown extensions', () => {
      expect(LinearAdapter.detectContentType('file.xyz')).toBe(
        'application/octet-stream',
      );
    });

    it('is case-insensitive', () => {
      expect(LinearAdapter.detectContentType('SCREENSHOT.PNG')).toBe(
        'image/png',
      );
    });

    it('sends correct content type for PNG in upload mutation', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'screenshot.png');

      const graphqlInit = getCallInit(fetchMock.mock.calls, 0);
      const body = JSON.parse(graphqlInit.body as string) as {
        variables: { contentType: string };
      };
      expect(body.variables.contentType).toBe('image/png');
    });

    it('sends correct content type for JPEG in upload mutation', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'photo.jpg');

      const graphqlInit = getCallInit(fetchMock.mock.calls, 0);
      const body = JSON.parse(graphqlInit.body as string) as {
        variables: { contentType: string };
      };
      expect(body.variables.contentType).toBe('image/jpeg');
    });

    it('sends correct content type for webm in upload mutation', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'audio.webm');

      const graphqlInit = getCallInit(fetchMock.mock.calls, 0);
      const body = JSON.parse(graphqlInit.body as string) as {
        variables: { contentType: string };
      };
      expect(body.variables.contentType).toBe('audio/webm');
    });
  });

  // == Error handling ==

  describe('error handling', () => {
    it('throws UPLOAD_FAILED on PUT failure (HTTP 500)', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(
        new Response('Server Error', { status: 500 }),
      );

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
        expect((e as ShakeNbakeError).retryable).toBe(false);
      }
    });

    it('throws UPLOAD_FAILED on PUT network error', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockRejectedValueOnce(new TypeError('Network error'));

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
      }
    });

    it('throws AUTH_FAILED on 401 during fileUpload mutation', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      );

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('AUTH_FAILED');
        expect((e as ShakeNbakeError).retryable).toBe(false);
      }
    });

    it('throws RATE_LIMITED on 429 during fileUpload mutation', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Too Many Requests', { status: 429 }),
      );

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('RATE_LIMITED');
        expect((e as ShakeNbakeError).retryable).toBe(true);
      }
    });

    it('throws NETWORK_ERROR on fetch failure during fileUpload mutation', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('NETWORK_ERROR');
      }
    });

    it('throws RATE_LIMITED on GraphQL RATELIMITED extension code during upload', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            errors: [
              {
                message: 'Rate limit exceeded',
                extensions: { code: 'RATELIMITED' },
              },
            ],
          }),
          { status: 200 },
        ),
      );

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('RATE_LIMITED');
        expect((e as ShakeNbakeError).retryable).toBe(true);
      }
    });

    it('throws UPLOAD_FAILED when fileUpload mutation returns success=false', async () => {
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({
          fileUpload: {
            success: false,
            uploadFile: {
              uploadUrl: '',
              assetUrl: '',
              headers: [],
            },
          },
        }),
      );

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
      }
    });

    it('throws UPLOAD_FAILED on PUT 403 (expired URL)', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(
        new Response('Forbidden', { status: 403 }),
      );

      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.uploadImage(Buffer.from('data'), 'test.png');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
      }
    });
  });

  // == PUT request structure ==

  describe('PUT request structure', () => {
    it('sends PUT method to upload URL', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'test.png');

      const putInit = getCallInit(fetchMock.mock.calls, 1);
      expect(putInit.method).toBe('PUT');
    });

    it('includes Content-Type header in PUT request', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'test.png');

      const putInit = getCallInit(fetchMock.mock.calls, 1);
      const headers = putInit.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('image/png');
    });

    it('includes Cache-Control header in PUT request', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'test.png');

      const putInit = getCallInit(fetchMock.mock.calls, 1);
      const headers = putInit.headers as Record<string, string>;
      expect(headers['Cache-Control']).toBe('public, max-age=31536000');
    });

    it('sends body as Blob even when input is Buffer', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('test-data'), 'test.png');

      const putInit = getCallInit(fetchMock.mock.calls, 1);
      expect(putInit.body).toBeInstanceOf(Blob);
    });

    it('passes Blob input directly as body', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      const inputBlob = new Blob(['test-data'], { type: 'image/png' });
      await adapter.uploadImage(inputBlob, 'test.png');

      const putInit = getCallInit(fetchMock.mock.calls, 1);
      // The body should be a Blob (the exact same instance or a Blob)
      expect(putInit.body).toBeInstanceOf(Blob);
    });
  });
});
