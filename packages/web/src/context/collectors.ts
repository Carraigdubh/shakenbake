// ---------------------------------------------------------------------------
// @shakenbake/web — BrowserContextCollector
// Gathers device / browser / environment context for bug reports.
// ---------------------------------------------------------------------------

import type {
  ContextCollector,
  DeviceContext,
  PlatformContext,
  ScreenInfo,
  NetworkInfo,
  BatteryInfo,
  LocaleInfo,
  AppInfo,
  AccessibilityInfo,
  PerformanceInfo,
  ConsoleInfo,
} from '@shakenbake/core';
import { redactContext } from '@shakenbake/core';

import type { ConsoleInterceptor } from './console-interceptor.js';

// Extend Navigator with non-standard but widely-supported APIs.
interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  }>;
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
    mobile?: boolean;
    platform?: string;
  };
}

/** Options for configuring the browser context collector. */
export interface BrowserContextCollectorOptions {
  /**
   * An optional console interceptor instance.
   * When provided, captured console entries will be included in the context.
   */
  consoleInterceptor?: ConsoleInterceptor;
  /**
   * Dot-path patterns of fields to redact from collected context.
   * E.g. `["app.url", "console"]` removes the URL and entire console section.
   */
  redactFields?: string[];
}

/**
 * Collects browser, device, network, and performance context for inclusion
 * in bug reports.  Each sub-collector is independently wrapped in a try/catch
 * so a single failure never prevents the rest of the context from being
 * gathered.
 */
export class BrowserContextCollector implements ContextCollector {
  readonly name = 'browser';
  readonly platform = 'web' as const;

  private readonly consoleInterceptor?: ConsoleInterceptor;
  private readonly redactFields: string[];

  constructor(options?: BrowserContextCollectorOptions) {
    this.consoleInterceptor = options?.consoleInterceptor;
    this.redactFields = options?.redactFields ?? [];
  }

  async collect(): Promise<Partial<DeviceContext>> {
    const context: Partial<DeviceContext> = {};

    context.platform = this.collectPlatform();
    context.screen = this.collectScreen();
    context.network = this.collectNetwork();
    context.battery = await this.collectBattery();
    context.locale = this.collectLocale();
    context.app = this.collectApp();
    context.accessibility = this.collectAccessibility();
    context.performance = this.collectPerformance();
    context.console = this.collectConsole();

    if (this.redactFields.length > 0) {
      return redactContext(context, this.redactFields);
    }

    return context;
  }

  // ---- Sub-collectors ----

  private collectPlatform(): PlatformContext {
    try {
      const nav = navigator as NavigatorWithConnection;
      const ua = navigator.userAgent;

      let browser = 'Unknown';
      let engine = 'Unknown';
      const isMobile = /Mobi|Android/i.test(ua);

      // Attempt to use the modern User-Agent Client Hints API.
      if (nav.userAgentData?.brands?.length) {
        const significant = nav.userAgentData.brands.find(
          (b) => b.brand !== 'Not A;Brand' && !b.brand.startsWith('Not'),
        );
        if (significant) {
          browser = `${significant.brand} ${significant.version}`;
        }
      } else {
        // Fallback: parse the traditional UA string.
        if (ua.includes('Firefox/')) {
          browser = `Firefox ${ua.split('Firefox/')[1]?.split(' ')[0] ?? ''}`;
          engine = 'Gecko';
        } else if (ua.includes('Edg/')) {
          browser = `Edge ${ua.split('Edg/')[1]?.split(' ')[0] ?? ''}`;
          engine = 'Blink';
        } else if (ua.includes('Chrome/')) {
          browser = `Chrome ${ua.split('Chrome/')[1]?.split(' ')[0] ?? ''}`;
          engine = 'Blink';
        } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
          browser = `Safari ${ua.split('Version/')[1]?.split(' ')[0] ?? ''}`;
          engine = 'WebKit';
        }
      }

      // Detect engine from UA when not already set.
      if (engine === 'Unknown') {
        if (ua.includes('AppleWebKit')) engine = 'WebKit';
        else if (ua.includes('Gecko')) engine = 'Gecko';
      }

      // Detect OS.
      let os = 'Unknown';
      if (nav.userAgentData?.platform) {
        os = nav.userAgentData.platform;
      } else if (ua.includes('Win')) {
        os = 'Windows';
      } else if (ua.includes('Mac')) {
        os = 'macOS';
      } else if (ua.includes('Linux')) {
        os = 'Linux';
      } else if (ua.includes('Android')) {
        os = 'Android';
      } else if (/iPhone|iPad|iPod/.test(ua)) {
        os = 'iOS';
      }

      return {
        os,
        userAgent: ua,
        browser,
        engine,
        isMobile,
      };
    } catch {
      return { os: 'Unknown' };
    }
  }

  private collectScreen(): ScreenInfo {
    try {
      return {
        width: screen.width,
        height: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        orientation: screen.orientation?.type,
        colorDepth: screen.colorDepth,
        touchSupport: navigator.maxTouchPoints,
      };
    } catch {
      return { width: 0, height: 0 };
    }
  }

  private collectNetwork(): NetworkInfo {
    try {
      const nav = navigator as NavigatorWithConnection;
      const conn = nav.connection;

      return {
        online: navigator.onLine,
        effectiveType: conn?.effectiveType,
        downlink: conn?.downlink,
        rtt: conn?.rtt,
        saveData: conn?.saveData,
      };
    } catch {
      return {};
    }
  }

  private async collectBattery(): Promise<BatteryInfo> {
    try {
      const nav = navigator as NavigatorWithConnection;
      if (!nav.getBattery) return {};

      const battery = await nav.getBattery();
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };
    } catch {
      return {};
    }
  }

  private collectLocale(): LocaleInfo {
    try {
      return {
        languages: [...navigator.languages],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
      };
    } catch {
      return {};
    }
  }

  private collectApp(): AppInfo {
    try {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        referrer: document.referrer || undefined,
        title: document.title || undefined,
      };
    } catch {
      return {};
    }
  }

  private collectAccessibility(): AccessibilityInfo {
    try {
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      let prefersColorScheme: string = 'no-preference';
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        prefersColorScheme = 'dark';
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        prefersColorScheme = 'light';
      }

      let prefersContrast: string = 'no-preference';
      if (window.matchMedia('(prefers-contrast: more)').matches) {
        prefersContrast = 'more';
      } else if (window.matchMedia('(prefers-contrast: less)').matches) {
        prefersContrast = 'less';
      }

      const forcedColors = window.matchMedia('(forced-colors: active)').matches
        ? 'active'
        : 'none';

      return {
        prefersReducedMotion,
        prefersColorScheme,
        prefersContrast,
        forcedColors,
      };
    } catch {
      return {};
    }
  }

  private collectPerformance(): PerformanceInfo {
    try {
      const result: PerformanceInfo = {};

      // Navigation timing.
      const [nav] = performance.getEntriesByType(
        'navigation',
      ) as PerformanceNavigationTiming[];
      if (nav) {
        result.pageLoadTime = Math.round(nav.loadEventEnd - nav.startTime);
        result.domContentLoaded = Math.round(
          nav.domContentLoadedEventEnd - nav.startTime,
        );
      }

      // Paint timing.
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          result.firstContentfulPaint = Math.round(entry.startTime);
        }
      }

      // Largest Contentful Paint (via PerformanceObserver snapshot).
      // LCP entries are only available if an observer has already been
      // registered; we read whatever entries exist from the buffer.
      try {
        const lcpEntries = performance.getEntriesByType(
          'largest-contentful-paint',
        );
        const last = lcpEntries[lcpEntries.length - 1];
        if (last) {
          result.largestContentfulPaint = Math.round(last.startTime);
        }
      } catch {
        // Not supported in all browsers.
      }

      // Memory usage (Chrome-only).
      const perfWithMemory = performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      };
      if (perfWithMemory.memory) {
        result.memoryUsage = {
          usedJSHeapSize: perfWithMemory.memory.usedJSHeapSize,
          totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
          jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
        };
      }

      return result;
    } catch {
      return {};
    }
  }

  private collectConsole(): ConsoleInfo {
    try {
      if (!this.consoleInterceptor) return {};

      const entries = this.consoleInterceptor.getEntries();

      return {
        recentLogs: entries.logs.map((e) => ({
          level: e.level,
          message: e.message,
          timestamp: e.timestamp,
        })),
        recentErrors: entries.errors.map((e) => ({
          message: e.message,
          timestamp: e.timestamp,
        })),
        unhandledRejections: entries.rejections.map((e) => ({
          reason: e.message,
          timestamp: e.timestamp,
        })),
      };
    } catch {
      return {};
    }
  }
}
