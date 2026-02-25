// ---------------------------------------------------------------------------
// @shakenbake/linear — Markdown description builder for Linear issues
// ---------------------------------------------------------------------------

import type {
  BugReport,
  DeviceContext,
  PlatformContext,
  DeviceInfo,
  ScreenInfo,
  NetworkInfo,
  BatteryInfo,
  LocaleInfo,
  AppInfo,
  NavigationInfo,
} from '@shakenbake/core';

/**
 * Build a formatted Markdown description for a Linear issue from a BugReport.
 *
 * Missing context fields are gracefully omitted (never shown as "undefined").
 */
export function buildIssueDescription(
  report: BugReport,
  screenshotUrl?: string,
  originalScreenshotUrl?: string,
  audioUrl?: string,
): string {
  const sections: string[] = [];

  // Header
  sections.push('## Bug Report');
  sections.push('');
  sections.push(report.description);
  sections.push('');

  // Audio transcript (if available)
  if (report.audio?.transcript) {
    sections.push('### Audio Transcript');
    sections.push('');
    sections.push(report.audio.transcript);
    sections.push('');
  }

  // Screenshots
  sections.push('### Screenshots');
  sections.push('');

  if (screenshotUrl) {
    sections.push('**Annotated:**');
    sections.push(`![Annotated screenshot](${screenshotUrl})`);
    sections.push('');
  }

  if (originalScreenshotUrl) {
    sections.push('**Original:**');
    sections.push(`![Original screenshot](${originalScreenshotUrl})`);
    sections.push('');
  }

  // Audio attachment link
  if (audioUrl) {
    sections.push(`**Audio recording:** [Listen](${audioUrl})`);
    sections.push('');
  }

  // Device context
  const contextTable = buildContextTable(report.context);
  if (contextTable) {
    sections.push('### Device Context');
    sections.push('');
    sections.push('| Field | Value |');
    sections.push('|---|---|');
    sections.push(contextTable);
    sections.push('');
  }

  // Console errors
  const consoleErrors = buildConsoleErrors(report.context);
  if (consoleErrors) {
    sections.push('### Console Errors (last 5)');
    sections.push('');
    sections.push(consoleErrors);
    sections.push('');
  }

  // Footer
  sections.push('---');
  sections.push('*Reported via [ShakeNbake](https://github.com/user/shakenbake)*');

  return sections.join('\n');
}

/**
 * Build a Markdown table of device context fields.
 * Only includes fields that have values.
 */
function buildContextTable(context: DeviceContext | Partial<DeviceContext> | undefined): string {
  const rows: string[] = [];

  // Platform
  const platform: Partial<PlatformContext> = context?.platform ?? {};
  if (platform.os) {
    const osDisplay = platform.osVersion
      ? `${platform.os} ${platform.osVersion}`
      : platform.os;
    rows.push(`| Platform | ${osDisplay} |`);
  }

  if (platform.userAgent) {
    rows.push(`| User Agent | ${platform.userAgent} |`);
  }

  if (platform.browser) {
    rows.push(`| Browser | ${platform.browser} |`);
  }

  // Device
  const device: Partial<DeviceInfo> = context?.device ?? {};
  const deviceParts = [device.manufacturer, device.model].filter(Boolean);
  if (deviceParts.length > 0) {
    rows.push(`| Device | ${deviceParts.join(' ')} |`);
  }

  // Screen
  const screen: Partial<ScreenInfo> = context?.screen ?? {};
  if (screen.width && screen.height) {
    const scaleStr = screen.scale ? ` @${String(screen.scale)}x` : '';
    rows.push(`| Screen | ${String(screen.width)}x${String(screen.height)}${scaleStr} |`);
  }

  // Network
  const network: Partial<NetworkInfo> = context?.network ?? {};
  const networkParts: string[] = [];
  if (network.type) networkParts.push(network.type);
  if (network.effectiveType) networkParts.push(`(${network.effectiveType})`);
  if (networkParts.length > 0) {
    rows.push(`| Network | ${networkParts.join(' ')} |`);
  }

  // Battery
  const battery: Partial<BatteryInfo> = context?.battery ?? {};
  if (battery.level !== undefined) {
    const stateStr = battery.state ? ` (${battery.state})` : '';
    rows.push(`| Battery | ${String(battery.level)}%${stateStr} |`);
  }

  // Locale
  const locale: Partial<LocaleInfo> = context?.locale ?? {};
  const localeParts = [locale.languageCode, locale.regionCode].filter(Boolean);
  if (localeParts.length > 0) {
    rows.push(`| Locale | ${localeParts.join('-')} |`);
  }

  if (locale.timezone) {
    rows.push(`| Timezone | ${locale.timezone} |`);
  }

  // App
  const app: Partial<AppInfo> = context?.app ?? {};
  if (app.version) {
    const buildStr = app.buildNumber ? ` (${app.buildNumber})` : '';
    rows.push(`| App Version | ${app.version}${buildStr} |`);
  }

  if (app.url) {
    rows.push(`| URL | ${app.url} |`);
  }

  // Navigation
  const navigation: Partial<NavigationInfo> = context?.navigation ?? {};
  if (navigation.currentRoute) {
    rows.push(`| Current Route | ${navigation.currentRoute} |`);
  }

  return rows.join('\n');
}

/**
 * Build a Markdown section for console errors (last 5).
 */
function buildConsoleErrors(context: DeviceContext | Partial<DeviceContext> | undefined): string | null {
  const errors = context?.console?.recentErrors;
  if (!errors || errors.length === 0) {
    return null;
  }

  const last5 = errors.slice(-5);
  const formatted = last5.map((err) => {
    const lines = [`\`\`\``, err.message];
    if (err.stack) {
      lines.push(err.stack);
    }
    lines.push(`\`\`\``);
    lines.push(`_${err.timestamp}_`);
    return lines.join('\n');
  });

  return formatted.join('\n\n');
}
