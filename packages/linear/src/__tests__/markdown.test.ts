import { describe, it, expect } from 'vitest';
import type { BugReport, DeviceContext } from '@shakenbake/core';
import { buildIssueDescription } from '../markdown.js';

function makeReport(overrides?: Partial<BugReport>): BugReport {
  return {
    id: 'report-001',
    timestamp: '2026-02-20T12:00:00.000Z',
    title: 'Bug title',
    description: 'Something went wrong.',
    severity: 'high',
    category: 'bug',
    screenshot: {
      annotated: 'base64-annotated',
      original: 'base64-original',
      dimensions: { width: 1080, height: 1920 },
    },
    context: {
      platform: { os: 'Android', osVersion: '14' },
      device: { manufacturer: 'Samsung', model: 'Galaxy S24' },
      screen: { width: 1080, height: 2340, scale: 2.5 },
      network: { type: 'cellular', effectiveType: '4g' },
      battery: { level: 72, state: 'charging' },
      locale: { languageCode: 'en', regionCode: 'US', timezone: 'America/Chicago' },
      app: { version: '2.0.0', buildNumber: '100' },
      accessibility: {},
      performance: {},
      navigation: { currentRoute: '/settings' },
      console: {
        recentErrors: [],
      },
    },
    ...overrides,
  };
}

describe('buildIssueDescription', () => {
  it('includes Bug Report header and description', () => {
    const md = buildIssueDescription(makeReport());
    expect(md).toContain('## Bug Report');
    expect(md).toContain('Something went wrong.');
  });

  it('includes annotated screenshot URL when provided', () => {
    const md = buildIssueDescription(
      makeReport(),
      'https://img.linear.app/annotated.png',
    );
    expect(md).toContain('**Annotated:**');
    expect(md).toContain('![Annotated screenshot](https://img.linear.app/annotated.png)');
  });

  it('includes original screenshot URL when provided', () => {
    const md = buildIssueDescription(
      makeReport(),
      undefined,
      'https://img.linear.app/original.png',
    );
    expect(md).toContain('**Original:**');
    expect(md).toContain('![Original screenshot](https://img.linear.app/original.png)');
  });

  it('includes audio link when provided', () => {
    const md = buildIssueDescription(
      makeReport(),
      undefined,
      undefined,
      'https://audio.linear.app/recording.webm',
    );
    expect(md).toContain('[Listen](https://audio.linear.app/recording.webm)');
  });

  it('includes audio transcript when available', () => {
    const report = makeReport({
      audio: {
        data: 'base64audio',
        durationMs: 3000,
        mimeType: 'audio/webm',
        transcript: 'The button is not responding',
      },
    });
    const md = buildIssueDescription(report);
    expect(md).toContain('### Audio Transcript');
    expect(md).toContain('The button is not responding');
  });

  it('includes device context table', () => {
    const md = buildIssueDescription(makeReport());
    expect(md).toContain('### Device Context');
    expect(md).toContain('Android 14');
    expect(md).toContain('Samsung Galaxy S24');
    expect(md).toContain('1080x2340 @2.5x');
    expect(md).toContain('cellular (4g)');
    expect(md).toContain('72% (charging)');
    expect(md).toContain('en-US');
    expect(md).toContain('America/Chicago');
    expect(md).toContain('2.0.0 (100)');
    expect(md).toContain('/settings');
  });

  it('wraps context in collapsible details tag', () => {
    const md = buildIssueDescription(makeReport());
    expect(md).toContain('<details>');
    expect(md).toContain('<summary>Full device and environment details</summary>');
    expect(md).toContain('</details>');
  });

  it('includes console errors when present', () => {
    const report = makeReport({
      context: {
        ...makeReport().context,
        console: {
          recentErrors: [
            {
              message: 'ReferenceError: x is not defined',
              stack: 'at eval (app.js:10)',
              timestamp: '2026-02-20T11:55:00Z',
            },
          ],
        },
      },
    });
    const md = buildIssueDescription(report);
    expect(md).toContain('### Console Errors (last 5)');
    expect(md).toContain('ReferenceError: x is not defined');
    expect(md).toContain('at eval (app.js:10)');
  });

  it('omits console errors section when no errors', () => {
    const report = makeReport();
    const md = buildIssueDescription(report);
    expect(md).not.toContain('### Console Errors');
  });

  it('gracefully handles missing context fields', () => {
    const report = makeReport({
      context: {
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
      },
    });
    const md = buildIssueDescription(report);
    // Should not contain "undefined"
    expect(md).not.toContain('undefined');
    // Should still have the basic structure
    expect(md).toContain('## Bug Report');
    expect(md).toContain('Platform | web');
  });

  it('does not throw when context sections are missing entirely', () => {
    const report = makeReport({
      context: {} as unknown as DeviceContext,
    });
    expect(() => buildIssueDescription(report)).not.toThrow();
    const md = buildIssueDescription(report);
    expect(md).toContain('## Bug Report');
    expect(md).not.toContain('undefined');
  });

  it('includes ShakeNbake footer', () => {
    const md = buildIssueDescription(makeReport());
    expect(md).toContain('*Reported via [ShakeNbake]');
  });

  it('limits console errors to last 5', () => {
    const errors = Array.from({ length: 8 }, (_, i) => ({
      message: `Error ${String(i + 1)}`,
      timestamp: `2026-02-20T11:5${String(i)}:00Z`,
    }));
    const report = makeReport({
      context: {
        ...makeReport().context,
        console: { recentErrors: errors },
      },
    });
    const md = buildIssueDescription(report);
    // Should contain the last 5 errors (4-8), not the first ones
    expect(md).toContain('Error 4');
    expect(md).toContain('Error 8');
    expect(md).not.toContain('Error 1');
    expect(md).not.toContain('Error 2');
    expect(md).not.toContain('Error 3');
  });
});
