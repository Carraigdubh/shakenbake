import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { ShakeNbakeError } from '@shakenbake/core';
import type { BugReport } from '@shakenbake/core';
import { LinearAdapter } from '../adapter.js';
import type { LinearConfig } from '../types.js';
import { DEFAULT_SEVERITY_MAPPING, DEFAULT_API_URL } from '../types.js';

// ---- Helpers ----

function makeConfig(overrides?: Partial<LinearConfig>): LinearConfig {
  return {
    apiKey: 'lin_api_test_key',
    teamId: 'team-123',
    ...overrides,
  };
}

function makeReport(overrides?: Partial<BugReport>): BugReport {
  return {
    id: 'report-001',
    timestamp: '2026-02-20T12:00:00.000Z',
    title: 'Button does not work',
    description: 'Clicking the submit button has no effect.',
    severity: 'high',
    category: 'bug',
    screenshot: {
      annotated: 'data:image/png;base64,aW1hZ2VkYXRh',
      original: 'data:image/png;base64,b3JpZ2luYWw=',
      dimensions: { width: 1080, height: 1920 },
    },
    context: {
      platform: { os: 'iOS', osVersion: '17.0' },
      device: { manufacturer: 'Apple', model: 'iPhone 15' },
      screen: { width: 1080, height: 1920, scale: 3 },
      network: { type: 'wifi', effectiveType: '4g' },
      battery: { level: 85, state: 'unplugged' },
      locale: { languageCode: 'en', regionCode: 'US', timezone: 'America/New_York' },
      app: { version: '1.2.3', buildNumber: '42' },
      accessibility: {},
      performance: {},
      navigation: { currentRoute: '/home' },
      console: {
        recentErrors: [
          {
            message: 'TypeError: Cannot read property "submit"',
            stack: 'at handleClick (app.js:42)',
            timestamp: '2026-02-20T11:59:55.000Z',
          },
        ],
      },
    },
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

/** Create a successful PUT response for file upload. */
function putResponse(): Response {
  return new Response(null, { status: 200 });
}

/** Standard file upload response data. */
function fileUploadData(index: number) {
  return {
    fileUpload: {
      success: true,
      uploadFile: {
        uploadUrl: `https://uploads.linear.app/upload-${String(index)}`,
        assetUrl: `https://assets.linear.app/asset-${String(index)}`,
        headers: [],
      },
    },
  };
}

/** Standard issue create response data. */
function issueCreateData() {
  return {
    issueCreate: {
      success: true,
      issue: {
        id: 'issue-abc',
        identifier: 'ENG-123',
        title: 'Button does not work',
        url: 'https://linear.app/team/issue/ENG-123',
      },
    },
  };
}

/** Extract the JSON body from a fetch mock call. */
function getCallBody(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calls: any[][],
  index: number,
): Record<string, unknown> {
  const call = calls[index] as [string, RequestInit] | undefined;
  if (!call) throw new Error(`No fetch call at index ${String(index)}`);
  return JSON.parse(call[1].body as string) as Record<string, unknown>;
}

// ---- Tests ----

describe('LinearAdapter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: MockInstance<any>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // == Constructor & Properties ==

  describe('constructor', () => {
    it('throws on empty apiKey', () => {
      expect(
        () =>
          new LinearAdapter(
            makeConfig({
              apiKey: '   ',
            }),
          ),
      ).toThrow('LinearAdapter requires a non-empty apiKey');
    });

    it('throws on empty teamId', () => {
      expect(
        () =>
          new LinearAdapter(
            makeConfig({
              teamId: '   ',
            }),
          ),
      ).toThrow('LinearAdapter requires a non-empty teamId');
    });

    it('stores config correctly', () => {
      const config = makeConfig({ projectId: 'proj-1' });
      const adapter = new LinearAdapter(config);
      expect(adapter.name).toBe('linear');
    });

    it('name property returns "linear"', () => {
      const adapter = new LinearAdapter(makeConfig());
      expect(adapter.name).toBe('linear');
    });

    it('uses default API URL when not specified', () => {
      const adapter = new LinearAdapter(makeConfig());
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ viewer: { id: 'user-1' } }),
      );
      void adapter.testConnection();
      expect(fetchMock).toHaveBeenCalledWith(
        DEFAULT_API_URL,
        expect.anything(),
      );
    });

    it('uses custom API URL when specified', () => {
      const customUrl = 'https://custom.linear.dev/graphql';
      const adapter = new LinearAdapter(makeConfig({ apiUrl: customUrl }));
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ viewer: { id: 'user-1' } }),
      );
      void adapter.testConnection();
      expect(fetchMock).toHaveBeenCalledWith(customUrl, expect.anything());
    });
  });

  // == testConnection ==

  describe('testConnection', () => {
    it('returns true on successful viewer query', async () => {
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ viewer: { id: 'user-1' } }),
      );
      const adapter = new LinearAdapter(makeConfig());
      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('returns false on auth failure (401)', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      );
      const adapter = new LinearAdapter(makeConfig());
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });

    it('returns false on auth failure (403)', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Forbidden', { status: 403 }),
      );
      const adapter = new LinearAdapter(makeConfig());
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });

    it('throws ShakeNbakeError with NETWORK_ERROR on fetch failure', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      const adapter = new LinearAdapter(makeConfig());

      try {
        await adapter.testConnection();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('NETWORK_ERROR');
        expect((e as ShakeNbakeError).retryable).toBe(true);
        expect((e as ShakeNbakeError).originalError).toBeInstanceOf(TypeError);
      }
    });

    it('sends Authorization header without Bearer prefix', async () => {
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ viewer: { id: 'user-1' } }),
      );
      const adapter = new LinearAdapter(makeConfig({ apiKey: 'lin_api_mykey' }));
      await adapter.testConnection();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'lin_api_mykey',
          }) as Record<string, string>,
        }),
      );
    });

    it('sends Content-Type application/json header', async () => {
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ viewer: { id: 'user-1' } }),
      );
      const adapter = new LinearAdapter(makeConfig());
      await adapter.testConnection();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }) as Record<string, string>,
        }),
      );
    });
  });

  // == createIssue ==

  describe('createIssue', () => {
    function mockSuccessfulIssueCreation() {
      // Upload annotated screenshot: fileUpload + PUT
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());
      // Upload original screenshot: fileUpload + PUT
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(2)));
      fetchMock.mockResolvedValueOnce(putResponse());
      // issueCreate mutation
      fetchMock.mockResolvedValueOnce(graphqlResponse(issueCreateData()));
    }

    it('returns SubmitResult on success', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(makeConfig());
      const result = await adapter.createIssue(makeReport());
      expect(result).toEqual({
        url: 'https://linear.app/team/issue/ENG-123',
        id: 'issue-abc',
        success: true,
      });
    });

    it('sends correct GraphQL mutation with teamId', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(makeConfig({ teamId: 'my-team' }));
      await adapter.createIssue(makeReport());

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { teamId: string } };
      };
      expect(body.variables.input.teamId).toBe('my-team');
    });

    it('trims teamId and projectId before issue creation', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(
        makeConfig({ teamId: '  team-trim  ', projectId: '  proj-trim  ' }),
      );
      await adapter.createIssue(makeReport());

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { teamId: string; projectId: string } };
      };
      expect(body.variables.input.teamId).toBe('team-trim');
      expect(body.variables.input.projectId).toBe('proj-trim');
    });

    it('builds markdown description with screenshot URLs', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(makeConfig());
      await adapter.createIssue(makeReport());

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { description: string } };
      };
      const desc = body.variables.input.description;

      expect(desc).toContain('## Bug Report');
      expect(desc).toContain('Clicking the submit button has no effect.');
      expect(desc).toContain('![Annotated screenshot]');
      expect(desc).toContain('https://assets.linear.app/asset-1');
      expect(desc).toContain('![Original screenshot]');
      expect(desc).toContain('https://assets.linear.app/asset-2');
    });

    it('includes device context in markdown', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(makeConfig());
      await adapter.createIssue(makeReport());

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { description: string } };
      };
      const desc = body.variables.input.description;

      expect(desc).toContain('iOS 17.0');
      expect(desc).toContain('Apple iPhone 15');
      expect(desc).toContain('1080x1920 @3x');
      expect(desc).toContain('/home');
    });

    it('includes console errors in markdown', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(makeConfig());
      await adapter.createIssue(makeReport());

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { description: string } };
      };
      const desc = body.variables.input.description;

      expect(desc).toContain('Console Errors');
      expect(desc).toContain('TypeError: Cannot read property "submit"');
    });

    it('maps severity to priority via default mapping', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(makeConfig());
      await adapter.createIssue(makeReport({ severity: 'critical' }));

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { priority: number } };
      };
      expect(body.variables.input.priority).toBe(
        DEFAULT_SEVERITY_MAPPING.critical,
      );
    });

    it('uses custom severity mapping when provided', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(
        makeConfig({
          severityMapping: { critical: 0, high: 1, medium: 2, low: 3 },
        }),
      );
      await adapter.createIssue(makeReport({ severity: 'high' }));

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { priority: number } };
      };
      expect(body.variables.input.priority).toBe(1);
    });

    it('includes projectId when configured', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(
        makeConfig({ projectId: 'proj-456' }),
      );
      await adapter.createIssue(makeReport());

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { projectId: string } };
      };
      expect(body.variables.input.projectId).toBe('proj-456');
    });

    it('includes assigneeId when configured', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(
        makeConfig({ defaultAssigneeId: 'user-789' }),
      );
      await adapter.createIssue(makeReport());

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { assigneeId: string } };
      };
      expect(body.variables.input.assigneeId).toBe('user-789');
    });

    it('merges default and category label IDs', async () => {
      mockSuccessfulIssueCreation();
      const adapter = new LinearAdapter(
        makeConfig({
          defaultLabelIds: ['label-default'],
          categoryLabels: { bug: 'label-bug', ui: 'label-ui' },
        }),
      );
      await adapter.createIssue(makeReport({ category: 'bug' }));

      const body = getCallBody(fetchMock.mock.calls, 4) as {
        variables: { input: { labelIds: string[] } };
      };
      expect(body.variables.input.labelIds).toEqual([
        'label-default',
        'label-bug',
      ]);
    });

    it('throws ShakeNbakeError on auth failure (401)', async () => {
      // All uploads fail with 401 — both screenshots fail so adapter throws UPLOAD_FAILED
      // before reaching the issueCreate mutation where AUTH_FAILED would surface.
      fetchMock.mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );
      const adapter = new LinearAdapter(makeConfig());

      try {
        await adapter.createIssue(makeReport());
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect(['AUTH_FAILED', 'UPLOAD_FAILED']).toContain(
          (e as ShakeNbakeError).code,
        );
      }
    });

    it('throws ShakeNbakeError on network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
      const adapter = new LinearAdapter(makeConfig());

      try {
        await adapter.createIssue(makeReport());
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect(['NETWORK_ERROR', 'UPLOAD_FAILED']).toContain(
          (e as ShakeNbakeError).code,
        );
      }
    });

    it('creates issue when both screenshot uploads fail', async () => {
      // Both screenshot uploads fail — adapter should still create issue with diagnostic text.
      fetchMock.mockRejectedValueOnce(new TypeError('upload failed'));
      fetchMock.mockRejectedValueOnce(new TypeError('upload failed'));
      fetchMock.mockResolvedValueOnce(graphqlResponse(issueCreateData()));

      const adapter = new LinearAdapter(makeConfig());
      const result = await adapter.createIssue(makeReport());
      expect(result.success).toBe(true);
    });

    it('creates issue when at least one screenshot uploads successfully', async () => {
      // Annotated screenshot fails, but original succeeds
      fetchMock.mockRejectedValueOnce(new TypeError('upload failed'));
      // Original screenshot: fileUpload + PUT
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(2)));
      fetchMock.mockResolvedValueOnce(putResponse());
      // issueCreate succeeds
      fetchMock.mockResolvedValueOnce(graphqlResponse(issueCreateData()));

      const adapter = new LinearAdapter(makeConfig());
      const result = await adapter.createIssue(makeReport());

      expect(result.success).toBe(true);
    });

    it('handles audio upload and includes in description', async () => {
      // Annotated screenshot: fileUpload + PUT
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());
      // Original screenshot: fileUpload + PUT
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(2)));
      fetchMock.mockResolvedValueOnce(putResponse());
      // Audio: fileUpload + PUT
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(3)));
      fetchMock.mockResolvedValueOnce(putResponse());
      // issueCreate
      fetchMock.mockResolvedValueOnce(graphqlResponse(issueCreateData()));

      const adapter = new LinearAdapter(makeConfig());
      const report = makeReport({
        audio: {
          data: 'YXVkaW9kYXRh',
          durationMs: 5000,
          mimeType: 'audio/webm',
          transcript: 'The submit button is broken',
        },
      });
      const result = await adapter.createIssue(report);

      expect(result.success).toBe(true);

      const body = getCallBody(fetchMock.mock.calls, 6) as {
        variables: { input: { description: string } };
      };
      const desc = body.variables.input.description;
      expect(desc).toContain('Audio Transcript');
      expect(desc).toContain('The submit button is broken');
      expect(desc).toContain('https://assets.linear.app/asset-3');
    });
  });

  // == uploadImage ==

  describe('uploadImage', () => {
    it('returns asset URL on successful upload', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      const url = await adapter.uploadImage(
        Buffer.from('image-data'),
        'test.png',
      );
      expect(url).toBe('https://assets.linear.app/asset-1');
    });

    it('sends correct content type for PNG files', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'screenshot.png');

      const body = getCallBody(fetchMock.mock.calls, 0) as {
        variables: { contentType: string };
      };
      expect(body.variables.contentType).toBe('image/png');
    });

    it('sends correct content type for JPEG files', async () => {
      fetchMock.mockResolvedValueOnce(graphqlResponse(fileUploadData(1)));
      fetchMock.mockResolvedValueOnce(putResponse());

      const adapter = new LinearAdapter(makeConfig());
      await adapter.uploadImage(Buffer.from('data'), 'screenshot.jpg');

      const body = getCallBody(fetchMock.mock.calls, 0) as {
        variables: { contentType: string };
      };
      expect(body.variables.contentType).toBe('image/jpeg');
    });

    it('throws ShakeNbakeError with UPLOAD_FAILED on PUT failure', async () => {
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
      }
    });

    it('throws ShakeNbakeError on fileUpload mutation auth failure', async () => {
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
      }
    });
  });

  // == linearFetch headers ==

  describe('linearFetch (via adapter)', () => {
    it('does not use Bearer prefix in Authorization header', async () => {
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ viewer: { id: 'user-1' } }),
      );
      const adapter = new LinearAdapter(
        makeConfig({ apiKey: 'lin_api_secret' }),
      );
      await adapter.testConnection();

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = call[1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('lin_api_secret');
      expect(headers['Authorization']).not.toContain('Bearer');
    });
  });

  // == Rate limit handling ==

  describe('rate limiting', () => {
    it('throws ShakeNbakeError with RATE_LIMITED on 429', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Too Many Requests', { status: 429 }),
      );
      const adapter = new LinearAdapter(makeConfig());
      try {
        await adapter.testConnection();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ShakeNbakeError);
        expect((e as ShakeNbakeError).code).toBe('RATE_LIMITED');
        expect((e as ShakeNbakeError).retryable).toBe(true);
      }
    });
  });
});
