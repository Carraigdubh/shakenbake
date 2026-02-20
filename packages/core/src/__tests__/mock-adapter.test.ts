import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockAdapter } from '../mock-adapter.js';
import type { BugReport } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBugReport(overrides: Partial<BugReport> = {}): BugReport {
  return {
    id: 'test-id-001',
    timestamp: new Date().toISOString(),
    title: 'Button does not respond',
    description: 'Tapping the submit button does nothing.',
    severity: 'high',
    category: 'bug',
    screenshot: {
      annotated: 'data:image/png;base64,AAAA',
      original: 'data:image/png;base64,BBBB',
      dimensions: { width: 375, height: 812 },
    },
    context: {
      platform: { os: 'ios' },
      device: {},
      screen: { width: 375, height: 812 },
      network: {},
      battery: {},
      locale: {},
      app: {},
      accessibility: {},
      performance: {},
      navigation: {},
      console: {},
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MockAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
    vi.restoreAllMocks();
  });

  // ---- Basic identity ----

  it('has name "mock"', () => {
    expect(adapter.name).toBe('mock');
  });

  // ---- uploadImage ----

  it('uploadImage returns a URL containing "mock.shakenbake.dev"', async () => {
    const url = await adapter.uploadImage(Buffer.from('png'), 'shot.png');
    expect(url).toContain('mock.shakenbake.dev');
    expect(url).toMatch(/^https:\/\/mock\.shakenbake\.dev\/images\/.+\.png$/);
  });

  it('uploadImage handles Buffer input', async () => {
    const buf = Buffer.from('fake-image-data');
    const url = await adapter.uploadImage(buf, 'buffer-test.png');
    expect(typeof url).toBe('string');
    expect(url).toContain('mock.shakenbake.dev');
  });

  it('uploadImage handles Blob input', async () => {
    const blob = new Blob(['fake-image-data'], { type: 'image/png' });
    const url = await adapter.uploadImage(blob, 'blob-test.png');
    expect(typeof url).toBe('string');
    expect(url).toContain('mock.shakenbake.dev');
  });

  it('uploadImage logs filename and size to console', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const buf = Buffer.from('12345');
    await adapter.uploadImage(buf, 'my-screenshot.png');

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('my-screenshot.png'),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('5 bytes'),
    );
  });

  // ---- createIssue ----

  it('createIssue returns a SubmitResult with url, id, and success: true', async () => {
    const report = makeBugReport();
    const result = await adapter.createIssue(report);

    expect(result.success).toBe(true);
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.url).toContain('mock.shakenbake.dev/issues/');
    expect(result.url).toContain(result.id);
  });

  it('createIssue stores the report in submittedReports', async () => {
    const report = makeBugReport();
    await adapter.createIssue(report);

    const stored = adapter.getSubmittedReports();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(report);
  });

  it('createIssue logs report title and metadata to console', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const report = makeBugReport({ title: 'My Cool Bug' });
    await adapter.createIssue(report);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('My Cool Bug'),
    );
  });

  // ---- getSubmittedReports / clearReports ----

  it('getSubmittedReports returns a copy (not the internal array)', async () => {
    const report = makeBugReport();
    await adapter.createIssue(report);

    const first = adapter.getSubmittedReports();
    const second = adapter.getSubmittedReports();

    // Different array references
    expect(first).not.toBe(second);
    // Same contents
    expect(first).toEqual(second);
  });

  it('clearReports empties the submitted reports list', async () => {
    await adapter.createIssue(makeBugReport());
    expect(adapter.getSubmittedReports()).toHaveLength(1);

    adapter.clearReports();
    expect(adapter.getSubmittedReports()).toHaveLength(0);
  });

  it('multiple reports accumulate correctly', async () => {
    const r1 = makeBugReport({ id: 'r1', title: 'First' });
    const r2 = makeBugReport({ id: 'r2', title: 'Second' });
    const r3 = makeBugReport({ id: 'r3', title: 'Third' });

    await adapter.createIssue(r1);
    await adapter.createIssue(r2);
    await adapter.createIssue(r3);

    const stored = adapter.getSubmittedReports();
    expect(stored).toHaveLength(3);
    expect(stored[0]!.title).toBe('First');
    expect(stored[1]!.title).toBe('Second');
    expect(stored[2]!.title).toBe('Third');
  });

  // ---- testConnection ----

  it('testConnection returns true', async () => {
    const connected = await adapter.testConnection();
    expect(connected).toBe(true);
  });

  // ---- delay option ----

  it('delay option adds latency to uploadImage', async () => {
    const delayedAdapter = new MockAdapter({ delay: 100 });

    const start = Date.now();
    await delayedAdapter.uploadImage(Buffer.from('x'), 'test.png');
    const elapsed = Date.now() - start;

    // Should take at least ~80ms (allowing a small margin for timer precision)
    expect(elapsed).toBeGreaterThanOrEqual(80);
  });

  it('delay option adds latency to createIssue', async () => {
    const delayedAdapter = new MockAdapter({ delay: 100 });

    const start = Date.now();
    await delayedAdapter.createIssue(makeBugReport());
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(80);
  });

  it('delay option adds latency to testConnection', async () => {
    const delayedAdapter = new MockAdapter({ delay: 100 });

    const start = Date.now();
    await delayedAdapter.testConnection();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(80);
  });

  it('zero delay does not add latency', async () => {
    const zeroAdapter = new MockAdapter({ delay: 0 });

    const start = Date.now();
    await zeroAdapter.uploadImage(Buffer.from('x'), 'test.png');
    const elapsed = Date.now() - start;

    // Should be virtually instant (well under 50ms)
    expect(elapsed).toBeLessThan(50);
  });

  // ---- default config ----

  it('works with no config argument', async () => {
    const defaultAdapter = new MockAdapter();
    const url = await defaultAdapter.uploadImage(Buffer.from('x'), 'a.png');
    expect(url).toContain('mock.shakenbake.dev');

    const result = await defaultAdapter.createIssue(makeBugReport());
    expect(result.success).toBe(true);

    const ok = await defaultAdapter.testConnection();
    expect(ok).toBe(true);
  });

  // ---- implements DestinationAdapter ----

  it('satisfies the DestinationAdapter interface', () => {
    // TypeScript will catch interface violations at compile-time, but we
    // also verify at runtime that the required methods exist.
    expect(typeof adapter.name).toBe('string');
    expect(typeof adapter.uploadImage).toBe('function');
    expect(typeof adapter.createIssue).toBe('function');
    expect(typeof adapter.testConnection).toBe('function');
  });
});
