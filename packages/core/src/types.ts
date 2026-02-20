// ---------------------------------------------------------------------------
// @shakenbake/core — Shared TypeScript types and plugin interfaces
// ---------------------------------------------------------------------------

// ---- Severity & Category Enums ----

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Category = 'bug' | 'ui' | 'crash' | 'performance' | 'other';

export type Platform = 'react-native' | 'web' | 'universal';

// ---- Device Context Sub-interfaces ----

export interface PlatformContext {
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

export interface DeviceInfo {
  manufacturer?: string;
  model?: string;
  modelId?: string;
  deviceType?: string;
  totalMemory?: number;
  deviceName?: string;
}

export interface ScreenInfo {
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

export interface NetworkInfo {
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

export interface BatteryInfo {
  level?: number;
  state?: string;
  lowPowerMode?: boolean;
  charging?: boolean;
  chargingTime?: number;
  dischargingTime?: number;
}

export interface LocaleInfo {
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

export interface AppInfo {
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

export interface AccessibilityInfo {
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

export interface PerformanceInfo {
  memoryUsage?: number | Record<string, number>;
  appUptime?: number;
  jsBundleLoadTime?: number;
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

export interface NavigationInfo {
  currentRoute?: string;
  routeParams?: Record<string, unknown>;
  navigationHistory?: string[];
}

export interface ConsoleInfo {
  recentLogs?: Array<{ level: string; message: string; timestamp: string }>;
  recentErrors?: Array<{
    message: string;
    stack?: string;
    timestamp: string;
  }>;
  unhandledRejections?: Array<{ reason: string; timestamp: string }>;
}

// ---- Aggregate Device Context ----

export interface DeviceContext {
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

// ---- Screenshot & Audio ----

export interface CaptureResult {
  imageData: string; // Base64-encoded image
  dimensions: { width: number; height: number };
  mimeType: string;
}

export interface AudioData {
  data: string; // Base64-encoded audio (Blob handled at platform level)
  durationMs: number;
  mimeType: string; // e.g. 'audio/webm', 'audio/m4a'
  transcript?: string; // Populated async by Cloud
}

// ---- Bug Report ----

export interface BugReport {
  id: string; // UUID generated client-side
  timestamp: string; // ISO 8601
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  screenshot: {
    annotated: string; // Base64 or URL of annotated image
    original: string; // Base64 or URL of original (un-annotated)
    dimensions: { width: number; height: number };
  };
  audio?: AudioData;
  context: DeviceContext;
  customMetadata?: Record<string, unknown>;
}

// ---- Report Input (user-provided fields before build) ----

export interface ReportInput {
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  annotatedScreenshot: string; // Base64
  originalScreenshot: string; // Base64
  audio?: string; // Base64
}

// ---- Submit Result ----

export interface SubmitResult {
  url: string;
  id: string;
  success: boolean;
}

// ---- Plugin Interfaces ----

export interface TriggerPlugin {
  name: string;
  platform: Platform;
  activate(onTrigger: () => void): void;
  deactivate(): void;
}

export interface CapturePlugin {
  name: string;
  platform: Platform;
  capture(): Promise<CaptureResult>;
}

export interface ContextCollector {
  name: string;
  platform: Platform;
  collect(): Promise<Partial<DeviceContext>>;
}

export interface DestinationAdapter {
  name: string;
  uploadImage(
    imageData: Buffer | Blob,
    filename: string,
  ): Promise<string>;
  createIssue(report: BugReport): Promise<SubmitResult>;
  testConnection(): Promise<boolean>;
}

// ---- Configuration ----

export interface ShakeNbakeConfig {
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
