# Feature: Core Plugin System (@shakenbake/core)

## Status: Planning

## Overview

The core package is the foundation of the entire ShakeNbake SDK. It defines all shared TypeScript interfaces, types, error handling contracts, and the plugin system that every other package depends on. It is platform-agnostic and contains no React Native or web-specific code.

The package provides:
- All shared TypeScript interfaces and types (BugReport, DeviceContext, ShakeNbakeConfig)
- Four plugin interfaces that define the extensible architecture (TriggerPlugin, CapturePlugin, ContextCollector, DestinationAdapter)
- A ReportBuilder class that orchestrates assembling a complete bug report from user input, screenshots, audio, and collected context
- A PluginRegistry for managing plugin lifecycle
- A typed error system (ShakeNbakeError) with standardized error codes
- Validation and sanitization of report data

## User Story

As a developer building a ShakeNbake platform SDK or destination adapter, I need a well-defined set of TypeScript interfaces and a report builder so that I can implement platform-specific functionality while maintaining compatibility with the rest of the ecosystem.

As a developer using ShakeNbake, I need typed errors with clear codes so that I can handle failures gracefully in my app's UI.

## Acceptance Criteria

### Types and Interfaces

- [ ] `BugReport` interface is defined with all required fields:
  ```typescript
  interface BugReport {
    id: string;                          // UUID generated client-side
    timestamp: string;                   // ISO 8601
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'bug' | 'ui' | 'crash' | 'performance' | 'other';
    screenshot: {
      annotated: string;                 // Base64 or URL of annotated image
      original: string;                  // Base64 or URL of original (unannotated)
      dimensions: { width: number; height: number };
    };
    audio?: {
      data: Blob | string;              // Audio file blob or base64
      durationMs: number;
      mimeType: string;                  // e.g. 'audio/webm', 'audio/m4a'
      transcript?: string;               // Populated async by Cloud
    };
    context: DeviceContext;
    customMetadata?: Record<string, unknown>;
  }
  ```

- [ ] `DeviceContext` interface is defined with all sub-interfaces:
  ```typescript
  interface DeviceContext {
    platform: PlatformContext;
    device: DeviceInfo;
    screen: ScreenInfo;
    network: NetworkInfo;
    battery: BatteryInfo;
    locale: LocaleInfo;
    app: AppInfo;
    accessibility: AccessibilityInfo;
    performance: PerformanceInfo;
    navigation: NavigationInfo;
    console: ConsoleInfo;
  }
  ```

- [ ] `PlatformContext` supports both RN and web fields:
  ```typescript
  interface PlatformContext {
    os: string;
    osVersion?: string;
    sdkVersion?: string;
    runtimeVersion?: string;
    isEmulator?: boolean;
    userAgent?: string;
    browser?: string;
    engine?: string;
    isMobile?: boolean;
  }
  ```

- [ ] `DeviceInfo` interface:
  ```typescript
  interface DeviceInfo {
    manufacturer?: string;
    model?: string;
    modelId?: string;
    deviceType?: string;
    totalMemory?: number;
    deviceName?: string;
  }
  ```

- [ ] `ScreenInfo` interface:
  ```typescript
  interface ScreenInfo {
    width: number;
    height: number;
    scale?: number;
    fontScale?: number;
    orientation?: string;
    viewportWidth?: number;
    viewportHeight?: number;
    devicePixelRatio?: number;
    colorDepth?: number;
    touchSupport?: number;
  }
  ```

- [ ] `NetworkInfo` interface:
  ```typescript
  interface NetworkInfo {
    type?: string;
    isConnected?: boolean;
    isInternetReachable?: boolean;
    cellularGeneration?: string;
    ipAddress?: string;
    isAirplaneMode?: boolean;
    online?: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  }
  ```

- [ ] `BatteryInfo` interface:
  ```typescript
  interface BatteryInfo {
    level?: number;
    state?: string;
    lowPowerMode?: boolean;
    charging?: boolean;
    chargingTime?: number;
    dischargingTime?: number;
  }
  ```

- [ ] `LocaleInfo` interface:
  ```typescript
  interface LocaleInfo {
    languageCode?: string;
    regionCode?: string;
    currencyCode?: string;
    timezone?: string;
    isRTL?: boolean;
    measurementSystem?: string;
    temperatureUnit?: string;
    languages?: string[];
    timezoneOffset?: number;
  }
  ```

- [ ] `AppInfo` interface:
  ```typescript
  interface AppInfo {
    version?: string;
    buildNumber?: string;
    bundleId?: string;
    installationId?: string;
    updateId?: string;
    url?: string;
    pathname?: string;
    referrer?: string;
    title?: string;
  }
  ```

- [ ] `AccessibilityInfo` interface:
  ```typescript
  interface AccessibilityInfo {
    fontScale?: number;
    screenReaderEnabled?: boolean;
    reduceMotionEnabled?: boolean;
    boldTextEnabled?: boolean;
    invertColorsEnabled?: boolean;
    prefersReducedMotion?: boolean;
    prefersColorScheme?: string;
    prefersContrast?: string;
    forcedColors?: string;
  }
  ```

- [ ] `PerformanceInfo` interface:
  ```typescript
  interface PerformanceInfo {
    memoryUsage?: number | Record<string, number>;
    appUptime?: number;
    jsBundleLoadTime?: number;
    pageLoadTime?: number;
    domContentLoaded?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  }
  ```

- [ ] `NavigationInfo` interface:
  ```typescript
  interface NavigationInfo {
    currentRoute?: string;
    routeParams?: Record<string, unknown>;
    navigationHistory?: string[];
  }
  ```

- [ ] `ConsoleInfo` interface:
  ```typescript
  interface ConsoleInfo {
    recentLogs?: Array<{ level: string; message: string; timestamp: string }>;
    recentErrors?: Array<{ message: string; stack?: string; timestamp: string }>;
    unhandledRejections?: Array<{ reason: string; timestamp: string }>;
  }
  ```

- [ ] `CaptureResult` type:
  ```typescript
  interface CaptureResult {
    imageData: string;  // Base64 encoded image
    dimensions: { width: number; height: number };
    mimeType: string;
  }
  ```

### Plugin Interfaces

- [ ] `TriggerPlugin` interface is defined:
  ```typescript
  interface TriggerPlugin {
    name: string;
    platform: 'react-native' | 'web' | 'universal';
    activate(onTrigger: () => void): void;
    deactivate(): void;
  }
  ```

- [ ] `CapturePlugin` interface is defined:
  ```typescript
  interface CapturePlugin {
    name: string;
    platform: 'react-native' | 'web' | 'universal';
    capture(): Promise<CaptureResult>;
  }
  ```

- [ ] `ContextCollector` interface is defined:
  ```typescript
  interface ContextCollector {
    name: string;
    platform: 'react-native' | 'web' | 'universal';
    collect(): Promise<Record<string, unknown>>;
  }
  ```

- [ ] `DestinationAdapter` interface is defined:
  ```typescript
  interface DestinationAdapter {
    name: string;
    uploadImage(imageData: Buffer | Blob, filename: string): Promise<string>;
    createIssue(report: BugReport): Promise<{ url: string; id: string }>;
    testConnection(): Promise<boolean>;
  }
  ```

### Configuration

- [ ] `ShakeNbakeConfig` interface is defined:
  ```typescript
  interface ShakeNbakeConfig {
    enabled: boolean;
    destination: DestinationAdapter;
    triggers?: TriggerPlugin[];
    contextCollectors?: ContextCollector[];
    customMetadata?: () => Record<string, unknown>;
    ui?: {
      theme?: 'light' | 'dark' | 'auto';
      accentColor?: string;
      position?: 'bottom-right' | 'bottom-left';
      showFAB?: boolean;
    };
    audio?: {
      enabled: boolean;
      maxDurationMs: number;
    };
    privacy?: {
      redactFields?: string[];
      requireConsent?: boolean;
      stripPersonalData?: boolean;
    };
  }
  ```

### Error Handling

- [ ] `ShakeNbakeError` class extends Error:
  ```typescript
  class ShakeNbakeError extends Error {
    code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'UPLOAD_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN';
    retryable: boolean;
    originalError?: unknown;
  }
  ```
- [ ] Error codes map to user-facing messages:
  - `NETWORK_ERROR` -> "You're offline. Report saved locally -- it will be submitted when you reconnect."
  - `AUTH_FAILED` -> "Unable to submit report. Check your API key configuration."
  - `RATE_LIMITED` -> "Too many reports submitted. Please try again in a moment."
  - `UPLOAD_FAILED` -> Screenshot is embedded as base64 in the issue description as a fallback.

### ReportBuilder

- [ ] `ReportBuilder` class assembles a complete `BugReport` from:
  - User input (title, description, severity, category)
  - Screenshot data (original + annotated)
  - Audio data (optional)
  - Collected device context (merged from all registered ContextCollectors)
  - Custom metadata (from config hook)
- [ ] Generates a client-side UUID for `report.id`
- [ ] Generates an ISO 8601 timestamp for `report.timestamp`
- [ ] Validates required fields (title, screenshot) before submission
- [ ] Sanitizes report data (strips personal data if configured)

### PluginRegistry

- [ ] `PluginRegistry` manages plugin lifecycle:
  - Register and unregister TriggerPlugins
  - Register and unregister CapturePlugins
  - Register and unregister ContextCollectors
  - Activate and deactivate triggers
  - Collect context from all registered collectors and merge results

### Offline Queue

- [ ] Failed submissions are queued for retry
- [ ] Queue contract is defined (platform SDKs implement storage: AsyncStorage for RN, localStorage for web)
- [ ] Retry on reconnect or next app launch

## Technical Approach

### Package Structure

```
packages/core/
  src/
    types.ts           # All shared interfaces (BugReport, DeviceContext, etc.)
    config.ts          # ShakeNbakeConfig interface
    errors.ts          # ShakeNbakeError class and error codes
    report-builder.ts  # ReportBuilder class
    plugin-registry.ts # PluginRegistry class
    context/
      types.ts         # ContextCollector interface
      base.ts          # Shared context (timestamp, app version)
    index.ts           # Public API exports
  package.json
  tsconfig.json
```

### Build

- TypeScript compiled to ESM and CJS
- No platform-specific dependencies (pure TypeScript)
- Exported as `@shakenbake/core`
- Turborepo manages builds

### Key Design Decisions

- All interfaces use optional fields where platform differences exist (e.g., `ScreenInfo.viewportWidth` only applies to web)
- `DestinationAdapter.testConnection()` returns `false` (not throws) on auth failure, per the error handling contract
- `DestinationAdapter.uploadImage()` and `createIssue()` throw `ShakeNbakeError` on failure
- Report IDs are UUIDs generated client-side to support offline queuing
- The `customMetadata` config field is a function (not a static object) so it captures state at report time

## Dependencies

- None (this is the foundational package with zero external dependencies)
- All other ShakeNbake packages depend on `@shakenbake/core`

## Tasks
