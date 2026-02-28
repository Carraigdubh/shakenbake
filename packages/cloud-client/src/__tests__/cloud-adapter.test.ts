import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import type { BugReport } from '@shakenbake/core';
import { CloudAdapter } from '../index.js';
import type { CloudAdapterConfig } from '../index.js';

// ---- Helpers ----

function makeConfig(overrides?: Partial<CloudAdapterConfig>): CloudAdapterConfig {
  return {
    apiKey: 'snb_app_test_key',
    endpoint: 'https://my-project.convex.site',
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
      console: {},
    },
    ...overrides,
  };
}

function successResponse(reportId: string): Response {
  return new Response(
    JSON.stringify({ success: true, reportId, message: 'Report received' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function errorResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---- Tests ----

describe('CloudAdapter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: MockInstance<any>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // == Constructor ==

  describe('constructor', () => {
    it('throws on missing apiKey', () => {
      expect(() => new CloudAdapter(makeConfig({ apiKey: '' }))).toThrow(
        'CloudAdapter: apiKey is required',
      );
    });

    it('throws on missing endpoint', () => {
      expect(() => new CloudAdapter(makeConfig({ endpoint: '' }))).toThrow(
        'CloudAdapter: endpoint is required',
      );
    });

    it('normalizes endpoint by stripping trailing slash', () => {
      const adapter = new CloudAdapter(
        makeConfig({ endpoint: 'https://example.convex.site/' }),
      );
      fetchMock.mockResolvedValueOnce(successResponse('rpt-1'));
      void adapter.createIssue(makeReport());
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.convex.site/api/ingest',
        expect.anything(),
      );
    });

    it('name property is "shakenbake-cloud"', () => {
      const adapter = new CloudAdapter(makeConfig());
      expect(adapter.name).toBe('shakenbake-cloud');
    });
  });

  // == uploadImage ==

  describe('uploadImage', () => {
    it('returns empty string (images sent inline)', async () => {
      const adapter = new CloudAdapter(makeConfig());
      const result = await adapter.uploadImage(
        Buffer.from('image-data'),
        'screenshot.png',
      );
      expect(result).toBe('');
    });
  });

  // == createIssue ==

  describe('createIssue', () => {
    it('sends POST to /api/ingest with correct URL', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(makeReport());

      expect(fetchMock).toHaveBeenCalledWith(
        'https://my-project.convex.site/api/ingest',
        expect.anything(),
      );
    });

    it('sends Authorization Bearer header', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(
        makeConfig({ apiKey: 'snb_app_my_secret' }),
      );
      await adapter.createIssue(makeReport());

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = call[1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer snb_app_my_secret');
    });

    it('sends Content-Type application/json header', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(makeReport());

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = call[1].headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('sends correct body shape', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(makeReport());

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(call[1].body as string) as Record<string, unknown>;

      expect(body.id).toBe('report-001');
      expect(body.title).toBe('Button does not work');
      expect(body.description).toBe('Clicking the submit button has no effect.');
      expect(body.severity).toBe('high');
      expect(body.category).toBe('bug');
      expect(body.context).toBeDefined();
    });

    it('returns SubmitResult on success', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-abc'));
      const adapter = new CloudAdapter(makeConfig());
      const result = await adapter.createIssue(makeReport());

      expect(result).toEqual({
        success: true,
        id: 'rpt-abc',
        url: 'https://my-project.convex.site/reports/rpt-abc',
      });
    });

    it('throws on error response with error field', async () => {
      fetchMock.mockResolvedValueOnce(
        errorResponse(401, { success: false, error: 'Invalid API key' }),
      );
      const adapter = new CloudAdapter(makeConfig());

      await expect(adapter.createIssue(makeReport())).rejects.toThrow(
        'CloudAdapter: 401 - Invalid API key',
      );
    });

    it('throws on error response with errors array', async () => {
      fetchMock.mockResolvedValueOnce(
        errorResponse(400, {
          success: false,
          errors: ['title is required', 'severity is required'],
        }),
      );
      const adapter = new CloudAdapter(makeConfig());

      await expect(adapter.createIssue(makeReport())).rejects.toThrow(
        'CloudAdapter: 400 - ["title is required","severity is required"]',
      );
    });

    it('sends screenshots when present', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(makeReport());

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(call[1].body as string) as Record<string, unknown>;

      expect(body.screenshotAnnotated).toBe('data:image/png;base64,aW1hZ2VkYXRh');
      expect(body.screenshotOriginal).toBe('data:image/png;base64,b3JpZ2luYWw=');
    });

    it('omits screenshots when not present', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(
        makeReport({
          screenshot: {
            annotated: '',
            original: '',
            dimensions: { width: 0, height: 0 },
          },
        }),
      );

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(call[1].body as string) as Record<string, unknown>;

      expect(body.screenshotAnnotated).toBeUndefined();
      expect(body.screenshotOriginal).toBeUndefined();
    });

    it('sends audio when present', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(
        makeReport({
          audio: {
            data: 'YXVkaW9kYXRh',
            durationMs: 5000,
            mimeType: 'audio/webm',
          },
        }),
      );

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(call[1].body as string) as Record<string, unknown>;

      expect(body.audio).toBe('YXVkaW9kYXRh');
    });

    it('omits audio when not present', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(makeReport()); // default report has no audio

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(call[1].body as string) as Record<string, unknown>;

      expect(body.audio).toBeUndefined();
    });

    it('sends customMetadata when present', async () => {
      fetchMock.mockResolvedValueOnce(successResponse('rpt-123'));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.createIssue(
        makeReport({ customMetadata: { env: 'staging', userId: '42' } }),
      );

      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(call[1].body as string) as Record<string, unknown>;

      expect(body.customMetadata).toEqual({ env: 'staging', userId: '42' });
    });
  });

  // == testConnection ==

  describe('testConnection', () => {
    it('returns true when server responds with 204', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      const adapter = new CloudAdapter(makeConfig());
      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('returns true when server responds with 200', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
      const adapter = new CloudAdapter(makeConfig());
      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('returns false when fetch throws', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      const adapter = new CloudAdapter(makeConfig());
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });

    it('sends OPTIONS request to /api/ingest', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      const adapter = new CloudAdapter(makeConfig());
      await adapter.testConnection();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://my-project.convex.site/api/ingest',
        expect.objectContaining({ method: 'OPTIONS' }),
      );
    });

    it('returns false when server responds with error status', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
      const adapter = new CloudAdapter(makeConfig());
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });
  });
});
