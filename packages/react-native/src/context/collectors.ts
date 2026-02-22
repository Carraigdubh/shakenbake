// ---------------------------------------------------------------------------
// @shakenbake/react-native — DeviceContextCollector
// Gathers device, screen, network, battery, locale, app, and accessibility
// context from various Expo and React Native APIs.
//
// Every module import is wrapped in its own try/catch so that a missing
// peer dependency (or a runtime error) never breaks the entire collection.
//
// Dynamic imports use string literals so that bundler/test tooling (Vite,
// Vitest) can correctly intercept and mock the modules at test time.
// ---------------------------------------------------------------------------

import type {
  ContextCollector,
  DeviceContext,
  PlatformContext,
  DeviceInfo,
  ScreenInfo,
  NetworkInfo,
  BatteryInfo,
  LocaleInfo,
  AppInfo,
  AccessibilityInfo as AccessibilityInfoType,
  Platform,
} from '@shakenbake/core';
import { redactContext } from '@shakenbake/core';

// ---------------------------------------------------------------------------
// Helper: safely dynamic-import a module; returns undefined on failure.
// ---------------------------------------------------------------------------

async function safeImport<T>(
  importFn: () => Promise<unknown>,
): Promise<T | undefined> {
  try {
    return (await importFn()) as T;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Sub-collectors — grouped by their source module to avoid concurrent
// duplicate imports of the same package.
// ---------------------------------------------------------------------------

/** Collects platform, screen, and accessibility from react-native. */
function extractFromReactNative(rn: Record<string, unknown>): {
  platform: Partial<PlatformContext>;
  screen: ScreenInfo;
  accessibility: AccessibilityInfoType;
  accessibilityAsync: Promise<AccessibilityInfoType>;
} {
  const platformResult: Partial<PlatformContext> = {};
  const screenResult: ScreenInfo = { width: 0, height: 0 };
  const accessibilityResult: AccessibilityInfoType = {};

  const PlatformAPI = rn['Platform'] as
    | { OS: string; Version: string | number }
    | undefined;
  if (PlatformAPI) {
    platformResult.os = PlatformAPI.OS;
    platformResult.osVersion = String(PlatformAPI.Version);
  }

  const Dimensions = rn['Dimensions'] as
    | { get(dim: string): { width: number; height: number } }
    | undefined;
  const PixelRatio = rn['PixelRatio'] as
    | { get(): number; getFontScale(): number }
    | undefined;

  if (Dimensions) {
    const win = Dimensions.get('window');
    screenResult.width = win.width;
    screenResult.height = win.height;
  }

  if (PixelRatio) {
    screenResult.scale = PixelRatio.get();
    screenResult.fontScale = PixelRatio.getFontScale();
    accessibilityResult.fontScale = PixelRatio.getFontScale();
  }

  // Async accessibility calls must be awaited separately.
  const accessibilityAsync = (async (): Promise<AccessibilityInfoType> => {
    const result = { ...accessibilityResult };
    const AccessibilityInfoAPI = rn['AccessibilityInfo'] as
      | {
          isScreenReaderEnabled(): Promise<boolean>;
          isReduceMotionEnabled?(): Promise<boolean>;
        }
      | undefined;

    if (AccessibilityInfoAPI) {
      try {
        if (typeof AccessibilityInfoAPI.isScreenReaderEnabled === 'function') {
          result.screenReaderEnabled =
            await AccessibilityInfoAPI.isScreenReaderEnabled();
        }
      } catch {
        // ignore
      }
      try {
        if (typeof AccessibilityInfoAPI.isReduceMotionEnabled === 'function') {
          result.reduceMotionEnabled =
            await AccessibilityInfoAPI.isReduceMotionEnabled();
        }
      } catch {
        // ignore
      }
    }
    return result;
  })();

  return {
    platform: platformResult,
    screen: screenResult,
    accessibility: accessibilityResult,
    accessibilityAsync,
  };
}

/** Collects platform and app info from expo-constants. */
function extractFromConstants(constants: Record<string, unknown>): {
  platform: Partial<PlatformContext>;
  app: AppInfo;
} {
  const platformResult: Partial<PlatformContext> = {};
  const appResult: AppInfo = {};

  const Constants = (constants['default'] ?? constants) as Record<
    string,
    unknown
  >;
  const manifest = (Constants['expoConfig'] ?? Constants['manifest']) as
    | Record<string, unknown>
    | undefined;

  if (manifest) {
    platformResult.runtimeVersion = manifest['runtimeVersion'] as
      | string
      | undefined;
    platformResult.sdkVersion = manifest['sdkVersion'] as string | undefined;

    appResult.version = manifest['version'] as string | undefined;
    const ios = manifest['ios'] as Record<string, unknown> | undefined;
    const android = manifest['android'] as Record<string, unknown> | undefined;
    appResult.buildNumber =
      (ios?.['buildNumber'] as string | undefined) ??
      (android?.['versionCode'] !== undefined
        ? String(android['versionCode'])
        : undefined);
    appResult.bundleId =
      (ios?.['bundleIdentifier'] as string | undefined) ??
      (android?.['package'] as string | undefined);
  }

  return { platform: platformResult, app: appResult };
}

async function collectDevice(): Promise<DeviceInfo> {
  const result: DeviceInfo = {};

  const device = await safeImport<Record<string, unknown>>(
    () => import('expo-device'),
  );
  if (device) {
    result.manufacturer = device['manufacturer'] as string | undefined;
    result.model = device['modelName'] as string | undefined;
    result.modelId = device['modelId'] as string | undefined;
    result.deviceType =
      device['deviceType'] !== undefined
        ? String(device['deviceType'])
        : undefined;
    result.totalMemory = device['totalMemory'] as number | undefined;
    result.deviceName = device['deviceName'] as string | undefined;
  }

  return result;
}

async function collectNetwork(): Promise<NetworkInfo> {
  const result: NetworkInfo = {};

  const netinfo = await safeImport<Record<string, unknown>>(
    () => import('@react-native-community/netinfo'),
  );
  if (netinfo) {
    const NetInfo = (netinfo['default'] ?? netinfo) as {
      fetch(): Promise<{
        type: string;
        isConnected: boolean | null;
        isInternetReachable: boolean | null;
      }>;
    };
    if (typeof NetInfo.fetch === 'function') {
      const state = await NetInfo.fetch();
      result.type = state.type;
      result.isConnected = state.isConnected ?? undefined;
      result.isInternetReachable = state.isInternetReachable ?? undefined;
    }
  }

  return result;
}

async function collectBattery(): Promise<BatteryInfo> {
  const result: BatteryInfo = {};

  const battery = await safeImport<Record<string, unknown>>(
    () => import('expo-battery'),
  );
  if (battery) {
    const getBatteryLevelAsync = battery['getBatteryLevelAsync'] as
      | (() => Promise<number>)
      | undefined;
    const getBatteryStateAsync = battery['getBatteryStateAsync'] as
      | (() => Promise<number>)
      | undefined;
    const isLowPowerModeEnabledAsync = battery[
      'isLowPowerModeEnabledAsync'
    ] as (() => Promise<boolean>) | undefined;

    if (typeof getBatteryLevelAsync === 'function') {
      result.level = await getBatteryLevelAsync();
    }
    if (typeof getBatteryStateAsync === 'function') {
      const state = await getBatteryStateAsync();
      result.state = String(state);
    }
    if (typeof isLowPowerModeEnabledAsync === 'function') {
      result.lowPowerMode = await isLowPowerModeEnabledAsync();
    }
  }

  return result;
}

async function collectLocale(): Promise<LocaleInfo> {
  const result: LocaleInfo = {};

  const localization = await safeImport<Record<string, unknown>>(
    () => import('expo-localization'),
  );
  if (localization) {
    const getLocales = localization['getLocales'] as
      | (() => Array<{
          languageCode: string | null;
          regionCode: string | null;
          currencyCode: string | null;
          textDirection: string;
        }>)
      | undefined;
    const getCalendars = localization['getCalendars'] as
      | (() => Array<{ timeZone: string | null }>)
      | undefined;

    if (typeof getLocales === 'function') {
      const locales = getLocales();
      const primary = locales[0];
      if (primary) {
        result.languageCode = primary.languageCode ?? undefined;
        result.regionCode = primary.regionCode ?? undefined;
        result.currencyCode = primary.currencyCode ?? undefined;
        result.isRTL = primary.textDirection === 'rtl';
      }
    }

    if (typeof getCalendars === 'function') {
      const calendars = getCalendars();
      const primary = calendars[0];
      if (primary) {
        result.timezone = primary.timeZone ?? undefined;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

/**
 * ContextCollector that gathers rich device and environment information
 * from React Native and Expo APIs.
 *
 * All native modules are **peer dependencies**.  Each sub-collector is
 * independently guarded so a missing module produces a partial result
 * rather than an error.
 */
/** Options for configuring the device context collector. */
export interface DeviceContextCollectorOptions {
  /**
   * Dot-path patterns of fields to redact from collected context.
   * E.g. `["device.deviceName", "locale"]` removes the device name and entire locale section.
   */
  redactFields?: string[];
}

export class DeviceContextCollector implements ContextCollector {
  readonly name = 'device';
  readonly platform: Platform = 'react-native';

  private readonly redactFields: string[];

  constructor(options?: DeviceContextCollectorOptions) {
    this.redactFields = options?.redactFields ?? [];
  }

  async collect(): Promise<Partial<DeviceContext>> {
    // Import modules once — each import is independent and guarded.
    const [rn, constants, device, network, battery, locale] =
      await Promise.all([
        safeImport<Record<string, unknown>>(() => import('react-native')),
        safeImport<Record<string, unknown>>(() => import('expo-constants')),
        collectDevice(),
        collectNetwork(),
        collectBattery(),
        collectLocale(),
      ]);

    // Extract data from react-native (synchronous + async accessibility).
    let platformFromRN: Partial<PlatformContext> = {};
    let screen: ScreenInfo = { width: 0, height: 0 };
    let accessibility: AccessibilityInfoType = {};

    if (rn) {
      const extracted = extractFromReactNative(rn);
      platformFromRN = extracted.platform;
      screen = extracted.screen;
      accessibility = await extracted.accessibilityAsync;
    }

    // Extract data from expo-constants (platform + app).
    let platformFromConstants: Partial<PlatformContext> = {};
    let app: AppInfo = {};

    if (constants) {
      const extracted = extractFromConstants(constants);
      platformFromConstants = extracted.platform;
      app = extracted.app;
    }

    // Merge platform data from both sources.
    const platform: PlatformContext = {
      os: platformFromRN.os ?? 'unknown',
      osVersion: platformFromRN.osVersion,
      runtimeVersion: platformFromConstants.runtimeVersion,
      sdkVersion: platformFromConstants.sdkVersion,
    };

    const context: Partial<DeviceContext> = {
      platform,
      device,
      screen,
      network,
      battery,
      locale,
      app,
      accessibility,
    };

    if (this.redactFields.length > 0) {
      return redactContext(context, this.redactFields);
    }

    return context;
  }
}
