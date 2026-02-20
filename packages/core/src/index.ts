// ---------------------------------------------------------------------------
// @shakenbake/core — Public API
// ---------------------------------------------------------------------------

// Types & Interfaces
export type {
  Severity,
  Category,
  Platform,
  PlatformContext,
  DeviceInfo,
  ScreenInfo,
  NetworkInfo,
  BatteryInfo,
  LocaleInfo,
  AppInfo,
  AccessibilityInfo,
  PerformanceInfo,
  NavigationInfo,
  ConsoleInfo,
  DeviceContext,
  CaptureResult,
  AudioData,
  BugReport,
  ReportInput,
  SubmitResult,
  TriggerPlugin,
  CapturePlugin,
  ContextCollector,
  DestinationAdapter,
  ShakeNbakeConfig,
} from './types.js';

// Errors
export {
  ShakeNbakeError,
  ERROR_MESSAGES,
} from './errors.js';
export type {
  ErrorCode,
  ShakeNbakeErrorOptions,
} from './errors.js';

// Plugin Registry
export { PluginRegistry } from './plugin-registry.js';

// Report Builder
export { ReportBuilder } from './report-builder.js';
