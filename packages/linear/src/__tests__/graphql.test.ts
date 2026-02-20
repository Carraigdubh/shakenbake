import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { ShakeNbakeError } from '@shakenbake/core';
import { linearFetch, requestUploadUrl, VIEWER_QUERY, ISSUE_CREATE_MUTATION, FILE_UPLOAD_MUTATION } from '../graphql.js';

describe('linearFetch', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: MockInstance<any>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST request with correct headers', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { viewer: { id: '1' } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await linearFetch('my-api-key', 'https://api.linear.app/graphql', VIEWER_QUERY);

    expect(fetchMock).toHaveBeenCalledWith('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'my-api-key',
      },
      body: JSON.stringify({ query: VIEWER_QUERY, variables: undefined }),
    });
  });

  it('returns data on successful response', async () => {
    const responseData = { viewer: { id: 'user-1' } };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: responseData }), { status: 200 }),
    );

    const result = await linearFetch('key', 'https://api.linear.app/graphql', VIEWER_QUERY);
    expect(result).toEqual(responseData);
  });

  it('passes variables in request body', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { issueCreate: {} } }), { status: 200 }),
    );

    const variables = { input: { title: 'Bug', teamId: 'team-1' } };
    await linearFetch('key', 'https://api.linear.app/graphql', ISSUE_CREATE_MUTATION, variables);

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string) as { variables: unknown };
    expect(body.variables).toEqual(variables);
  });

  it('throws AUTH_FAILED on HTTP 401', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    try {
      await linearFetch('bad-key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('AUTH_FAILED');
      expect((e as ShakeNbakeError).retryable).toBe(false);
    }
  });

  it('throws AUTH_FAILED on HTTP 403', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

    try {
      await linearFetch('bad-key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('AUTH_FAILED');
    }
  });

  it('throws RATE_LIMITED on HTTP 429', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }));

    try {
      await linearFetch('key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('RATE_LIMITED');
      expect((e as ShakeNbakeError).retryable).toBe(true);
    }
  });

  it('throws NETWORK_ERROR on fetch failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await linearFetch('key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('NETWORK_ERROR');
      expect((e as ShakeNbakeError).originalError).toBeInstanceOf(TypeError);
    }
  });

  it('throws UNKNOWN on non-standard HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

    try {
      await linearFetch('key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('UNKNOWN');
    }
  });

  it('throws on GraphQL errors in response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          errors: [{ message: 'Team not found' }],
        }),
        { status: 200 },
      ),
    );

    try {
      await linearFetch('key', 'https://api.linear.app/graphql', ISSUE_CREATE_MUTATION, {});
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).message).toContain('Team not found');
    }
  });

  it('throws RATE_LIMITED on GraphQL RATELIMITED extension code', async () => {
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

    try {
      await linearFetch('key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('RATE_LIMITED');
      expect((e as ShakeNbakeError).retryable).toBe(true);
    }
  });

  it('throws AUTH_FAILED on GraphQL authentication error', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          errors: [{ message: 'Authentication required' }],
        }),
        { status: 200 },
      ),
    );

    try {
      await linearFetch('key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('AUTH_FAILED');
    }
  });

  it('throws UNKNOWN on empty data response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: null }), { status: 200 }),
    );

    try {
      await linearFetch('key', 'https://api.linear.app/graphql', VIEWER_QUERY);
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('UNKNOWN');
      expect((e as ShakeNbakeError).message).toContain('empty response');
    }
  });
});

describe('GraphQL constants', () => {
  it('VIEWER_QUERY contains viewer query', () => {
    expect(VIEWER_QUERY).toContain('viewer');
    expect(VIEWER_QUERY).toContain('id');
  });

  it('ISSUE_CREATE_MUTATION contains issueCreate', () => {
    expect(ISSUE_CREATE_MUTATION).toContain('issueCreate');
    expect(ISSUE_CREATE_MUTATION).toContain('IssueCreateInput');
    expect(ISSUE_CREATE_MUTATION).toContain('success');
    expect(ISSUE_CREATE_MUTATION).toContain('url');
  });

  it('FILE_UPLOAD_MUTATION contains fileUpload with headers', () => {
    expect(FILE_UPLOAD_MUTATION).toContain('fileUpload');
    expect(FILE_UPLOAD_MUTATION).toContain('uploadUrl');
    expect(FILE_UPLOAD_MUTATION).toContain('assetUrl');
    expect(FILE_UPLOAD_MUTATION).toContain('headers');
    expect(FILE_UPLOAD_MUTATION).toContain('key');
    expect(FILE_UPLOAD_MUTATION).toContain('value');
    expect(FILE_UPLOAD_MUTATION).toContain('success');
  });
});

describe('requestUploadUrl', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: MockInstance<any>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns uploadUrl, assetUrl, and headers on success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl: 'https://uploads.linear.app/upload-1',
                assetUrl: 'https://assets.linear.app/asset-1',
                headers: [{ key: 'x-amz-acl', value: 'public-read' }],
              },
            },
          },
        }),
        { status: 200 },
      ),
    );

    const result = await requestUploadUrl(
      'api-key',
      'https://api.linear.app/graphql',
      'test.png',
      'image/png',
      1024,
    );

    expect(result.uploadUrl).toBe('https://uploads.linear.app/upload-1');
    expect(result.assetUrl).toBe('https://assets.linear.app/asset-1');
    expect(result.headers).toEqual([{ key: 'x-amz-acl', value: 'public-read' }]);
  });

  it('throws UPLOAD_FAILED when success is false', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            fileUpload: {
              success: false,
              uploadFile: {
                uploadUrl: '',
                assetUrl: '',
                headers: [],
              },
            },
          },
        }),
        { status: 200 },
      ),
    );

    try {
      await requestUploadUrl(
        'api-key',
        'https://api.linear.app/graphql',
        'test.png',
        'image/png',
        1024,
      );
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
    }
  });

  it('propagates AUTH_FAILED from linearFetch', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    );

    try {
      await requestUploadUrl(
        'bad-key',
        'https://api.linear.app/graphql',
        'test.png',
        'image/png',
        1024,
      );
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('AUTH_FAILED');
    }
  });

  it('propagates NETWORK_ERROR from linearFetch', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    try {
      await requestUploadUrl(
        'api-key',
        'https://api.linear.app/graphql',
        'test.png',
        'image/png',
        1024,
      );
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('NETWORK_ERROR');
    }
  });
});
