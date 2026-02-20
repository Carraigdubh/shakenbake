import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProxyAdapter } from '../adapters/proxy.js';
import { ShakeNbakeError } from '@shakenbake/core';
import type { BugReport, DeviceContext } from '@shakenbake/core';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function mockFetch(
  impl: (url: string | URL | Request, init?: RequestInit) => Promise<Response>,
) {
  globalThis.fetch = vi.fn(impl);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://api.example.com/shakenbake';

function createAdapter(): ProxyAdapter {
  return new ProxyAdapter({ endpoint: ENDPOINT });
}

function emptyContext(): DeviceContext {
  return {
    platform: { os: 'web' },
    device: {},
    screen: { width: 1920, height: 1080 },
    network: {},
    battery: {},
    locale: {},
    app: {},
    accessibility: {},
    performance: {},
    navigation: {},
    console: {},
  };
}

function fakeBugReport(): BugReport {
  return {
    id: 'test-id',
    timestamp: '2026-02-20T00:00:00Z',
    title: 'Test bug',
    description: 'Test description',
    severity: 'medium',
    category: 'bug',
    screenshot: {
      annotated: 'base64data',
      original: 'base64original',
      dimensions: { width: 800, height: 600 },
    },
    context: emptyContext(),
  };
}

// ---------------------------------------------------------------------------
// Tests: uploadImage
// ---------------------------------------------------------------------------

describe('ProxyAdapter', () => {
  describe('uploadImage', () => {
    it('sends POST to /upload with FormData', async () => {
      mockFetch(async (url, init) => {
        expect(url).toBe(`${ENDPOINT}/upload`);
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(FormData);
        return new Response(JSON.stringify({ url: 'https://cdn.example.com/img.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const adapter = createAdapter();
      const blob = new Blob(['test'], { type: 'image/png' });
      const url = await adapter.uploadImage(blob, 'test.png');

      expect(url).toBe('https://cdn.example.com/img.png');
    });

    it('throws NETWORK_ERROR when fetch fails', async () => {
      mockFetch(async () => {
        throw new TypeError('Failed to fetch');
      });

      const adapter = createAdapter();
      const blob = new Blob(['test'], { type: 'image/png' });

      await expect(adapter.uploadImage(blob, 'test.png')).rejects.toThrow(
        ShakeNbakeError,
      );

      try {
        await adapter.uploadImage(blob, 'test.png');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('NETWORK_ERROR');
      }
    });

    it('throws AUTH_FAILED on 401 response', async () => {
      mockFetch(async () => {
        return new Response('Unauthorized', { status: 401 });
      });

      const adapter = createAdapter();
      const blob = new Blob(['test'], { type: 'image/png' });

      try {
        await adapter.uploadImage(blob, 'test.png');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('AUTH_FAILED');
      }
    });

    it('throws RATE_LIMITED on 429 response', async () => {
      mockFetch(async () => {
        return new Response('Too Many Requests', { status: 429 });
      });

      const adapter = createAdapter();
      const blob = new Blob(['test'], { type: 'image/png' });

      try {
        await adapter.uploadImage(blob, 'test.png');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('RATE_LIMITED');
      }
    });

    it('throws UPLOAD_FAILED on 500 response', async () => {
      mockFetch(async () => {
        return new Response('Server Error', { status: 500 });
      });

      const adapter = createAdapter();
      const blob = new Blob(['test'], { type: 'image/png' });

      try {
        await adapter.uploadImage(blob, 'test.png');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
      }
    });

    it('throws UPLOAD_FAILED when response has no url field', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const adapter = createAdapter();
      const blob = new Blob(['test'], { type: 'image/png' });

      try {
        await adapter.uploadImage(blob, 'test.png');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: createIssue
  // ---------------------------------------------------------------------------

  describe('createIssue', () => {
    it('sends POST to /issue with JSON body', async () => {
      const report = fakeBugReport();

      mockFetch(async (url, init) => {
        expect(url).toBe(`${ENDPOINT}/issue`);
        expect(init?.method).toBe('POST');
        expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
        const body = JSON.parse(init?.body as string) as BugReport;
        expect(body.title).toBe('Test bug');
        return new Response(
          JSON.stringify({ url: 'https://linear.app/issue/1', id: 'issue-1' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const adapter = createAdapter();
      const result = await adapter.createIssue(report);

      expect(result.url).toBe('https://linear.app/issue/1');
      expect(result.id).toBe('issue-1');
      expect(result.success).toBe(true);
    });

    it('throws NETWORK_ERROR when fetch fails', async () => {
      mockFetch(async () => {
        throw new Error('Network offline');
      });

      const adapter = createAdapter();

      try {
        await adapter.createIssue(fakeBugReport());
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('NETWORK_ERROR');
      }
    });

    it('throws AUTH_FAILED on 403 response', async () => {
      mockFetch(async () => {
        return new Response('Forbidden', { status: 403 });
      });

      const adapter = createAdapter();

      try {
        await adapter.createIssue(fakeBugReport());
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShakeNbakeError);
        expect((err as ShakeNbakeError).code).toBe('AUTH_FAILED');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: testConnection
  // ---------------------------------------------------------------------------

  describe('testConnection', () => {
    it('returns true when /health returns 200', async () => {
      mockFetch(async (url) => {
        expect(url).toBe(`${ENDPOINT}/health`);
        return new Response('OK', { status: 200 });
      });

      const adapter = createAdapter();
      const ok = await adapter.testConnection();
      expect(ok).toBe(true);
    });

    it('returns false when /health returns 401', async () => {
      mockFetch(async () => {
        return new Response('Unauthorized', { status: 401 });
      });

      const adapter = createAdapter();
      const ok = await adapter.testConnection();
      expect(ok).toBe(false);
    });

    it('returns false when fetch throws', async () => {
      mockFetch(async () => {
        throw new Error('Network error');
      });

      const adapter = createAdapter();
      const ok = await adapter.testConnection();
      expect(ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: General
  // ---------------------------------------------------------------------------

  describe('general', () => {
    it('has name "proxy"', () => {
      const adapter = createAdapter();
      expect(adapter.name).toBe('proxy');
    });

    it('strips trailing slashes from endpoint', async () => {
      const adapter = new ProxyAdapter({ endpoint: 'https://api.example.com/' });

      mockFetch(async (url) => {
        expect(url).toBe('https://api.example.com/health');
        return new Response('OK', { status: 200 });
      });

      await adapter.testConnection();
    });
  });
});
