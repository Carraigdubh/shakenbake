// ---------------------------------------------------------------------------
// Tests for DeviceContextCollector
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-native — use plain functions (not vi.fn) so vi.clearAllMocks
// does not wipe their implementations.
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
  Dimensions: {
    get: (_dim: string) => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  },
  PixelRatio: {
    get: () => 3,
    getFontScale: () => 1,
  },
  AccessibilityInfo: {
    isScreenReaderEnabled: () => Promise.resolve(false),
    isReduceMotionEnabled: () => Promise.resolve(false),
  },
}));

// Mock expo-device
vi.mock('expo-device', () => ({
  manufacturer: 'Apple',
  modelName: 'iPhone 15 Pro',
  modelId: 'iPhone16,1',
  deviceType: 1,
  totalMemory: 6442450944,
  deviceName: 'My iPhone',
}));

// Mock expo-constants
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.0.0',
      runtimeVersion: '1.0.0',
      sdkVersion: '54.0.0',
      ios: {
        bundleIdentifier: 'com.example.app',
        buildNumber: '42',
      },
      android: {
        package: 'com.example.app',
        versionCode: 42,
      },
    },
  },
}));

// Mock expo-battery
vi.mock('expo-battery', () => ({
  getBatteryLevelAsync: vi.fn().mockResolvedValue(0.85),
  getBatteryStateAsync: vi.fn().mockResolvedValue(2),
  isLowPowerModeEnabledAsync: vi.fn().mockResolvedValue(false),
}));

// Mock expo-localization
vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [
    {
      languageCode: 'en',
      regionCode: 'US',
      currencyCode: 'USD',
      textDirection: 'ltr',
    },
  ]),
  getCalendars: vi.fn(() => [
    {
      timeZone: 'America/New_York',
    },
  ]),
}));

// Mock @react-native-community/netinfo
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
    }),
  },
}));

import { DeviceContextCollector } from '../context/collectors.js';

describe('DeviceContextCollector', () => {
  let collector: DeviceContextCollector;

  beforeEach(() => {
    collector = new DeviceContextCollector();
  });

  it('has correct name and platform', () => {
    expect(collector.name).toBe('device');
    expect(collector.platform).toBe('react-native');
  });

  it('collects full context when all modules are available', async () => {
    const context = await collector.collect();

    // Platform
    expect(context.platform).toBeDefined();
    expect(context.platform?.os).toBe('ios');
    expect(context.platform?.osVersion).toBe('17.0');
    expect(context.platform?.runtimeVersion).toBe('1.0.0');
    expect(context.platform?.sdkVersion).toBe('54.0.0');

    // Device
    expect(context.device).toBeDefined();
    expect(context.device?.manufacturer).toBe('Apple');
    expect(context.device?.model).toBe('iPhone 15 Pro');
    expect(context.device?.modelId).toBe('iPhone16,1');
    expect(context.device?.totalMemory).toBe(6442450944);

    // Screen
    expect(context.screen).toBeDefined();
    expect(context.screen?.width).toBe(390);
    expect(context.screen?.height).toBe(844);
    expect(context.screen?.scale).toBe(3);
    expect(context.screen?.fontScale).toBe(1);

    // Network
    expect(context.network).toBeDefined();
    expect(context.network?.type).toBe('wifi');
    expect(context.network?.isConnected).toBe(true);
    expect(context.network?.isInternetReachable).toBe(true);

    // Battery
    expect(context.battery).toBeDefined();
    expect(context.battery?.level).toBe(0.85);
    expect(context.battery?.state).toBe('2');
    expect(context.battery?.lowPowerMode).toBe(false);

    // Locale
    expect(context.locale).toBeDefined();
    expect(context.locale?.languageCode).toBe('en');
    expect(context.locale?.regionCode).toBe('US');
    expect(context.locale?.timezone).toBe('America/New_York');
    expect(context.locale?.isRTL).toBe(false);

    // App
    expect(context.app).toBeDefined();
    expect(context.app?.version).toBe('1.0.0');
    expect(context.app?.bundleId).toBe('com.example.app');
    expect(context.app?.buildNumber).toBe('42');

    // Accessibility
    expect(context.accessibility).toBeDefined();
    expect(context.accessibility?.screenReaderEnabled).toBe(false);
    expect(context.accessibility?.reduceMotionEnabled).toBe(false);
    expect(context.accessibility?.fontScale).toBe(1);
  });

  it('returns all expected top-level keys', async () => {
    const context = await collector.collect();

    expect(context).toHaveProperty('platform');
    expect(context).toHaveProperty('device');
    expect(context).toHaveProperty('screen');
    expect(context).toHaveProperty('network');
    expect(context).toHaveProperty('battery');
    expect(context).toHaveProperty('locale');
    expect(context).toHaveProperty('app');
    expect(context).toHaveProperty('accessibility');
  });
});

describe('DeviceContextCollector — partial failure resilience', () => {
  it('returns partial data when a sub-collector module fails', async () => {
    // Reset all module mocks and make expo-battery throw
    vi.resetModules();

    // Re-mock everything except expo-battery which will throw
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android', Version: '14' },
      Dimensions: {
        get: () => ({ width: 360, height: 800, scale: 2, fontScale: 1 }),
      },
      PixelRatio: { get: () => 2, getFontScale: () => 1 },
      AccessibilityInfo: {
        isScreenReaderEnabled: () => Promise.resolve(false),
        isReduceMotionEnabled: () => Promise.resolve(false),
      },
    }));

    vi.doMock('expo-device', () => ({
      manufacturer: 'Samsung',
      modelName: 'Galaxy S24',
      modelId: null,
      deviceType: 1,
      totalMemory: 8589934592,
      deviceName: 'My Galaxy',
    }));

    vi.doMock('expo-constants', () => ({
      default: { expoConfig: { version: '2.0.0' } },
    }));

    // expo-battery will throw on import
    vi.doMock('expo-battery', () => {
      throw new Error('Module not found');
    });

    vi.doMock('expo-localization', () => ({
      getLocales: () => [
        { languageCode: 'de', regionCode: 'DE', currencyCode: 'EUR', textDirection: 'ltr' },
      ],
      getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
    }));

    vi.doMock('@react-native-community/netinfo', () => ({
      default: {
        fetch: () => Promise.resolve({ type: 'cellular', isConnected: true, isInternetReachable: true }),
      },
    }));

    // Re-import the collector with fresh mocks
    const { DeviceContextCollector: FreshCollector } = await import(
      '../context/collectors.js'
    );
    const collector = new FreshCollector();
    const context = await collector.collect();

    // Platform should still work
    expect(context.platform?.os).toBe('android');

    // Device should still work
    expect(context.device?.manufacturer).toBe('Samsung');

    // Battery should be empty (module threw) but not break others
    expect(context.battery).toBeDefined();

    // Locale should still work
    expect(context.locale?.languageCode).toBe('de');

    // Network should still work
    expect(context.network?.type).toBe('cellular');
  });
});
