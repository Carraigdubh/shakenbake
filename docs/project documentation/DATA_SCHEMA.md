# ShakeNbake - Data Schema and Types

## Core Types

### ShakeNbakeConfig
Main configuration object for the provider.

```typescript
interface ShakeNbakeConfig {
  /**
   * Enable/disable the entire SDK
   */
  enabled: boolean;

  /**
   * Destination adapter for issue creation
   * Required: LinearAdapter, ProxyAdapter, MockAdapter, or custom
   */
  destination: DestinationAdapter;

  /**
   * UI customization
   */
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    accentColor?: string;
    showFAB?: boolean;              // Show floating action button (web only)
    position?: 'bottom-right' | 'bottom-left';
  };

  /**
   * Privacy and data filtering
   */
  privacy?: {
    redactFields?: string[];  // e.g., ['app.url', 'console']
  };

  /**
   * Custom metadata to attach to every report
   */
  customMetadata?: () => Record<string, unknown>;

  /**
   * Additional trigger plugins (ShakeTrigger registered by default on mobile)
   */
  triggers?: TriggerPlugin[];

  /**
   * Additional context collectors (DeviceContextCollector registered by default)
   */
  contextCollectors?: ContextCollector[];
}
```

### BugReport
Represents a complete bug report ready for submission.

```typescript
interface BugReport {
  /**
   * User-provided bug title
   */
  title: string;

  /**
   * User-provided description
   */
  description: string;

  /**
   * Issue severity
   */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /**
   * Screenshot data
   */
  screenshot: {
    /**
     * Annotated screenshot (user-drawn markups)
     * Base64 string or Blob/Buffer
     */
    annotated: string | Blob | Buffer;

    /**
     * Original unmodified screenshot
     * Base64 string or Blob/Buffer
     */
    original: string | Blob | Buffer;

    /**
     * Screenshot dimensions
     */
    dimensions: {
      width: number;
      height: number;
    };
  };

  /**
   * Optional audio memo
   */
  audio?: {
    data: Blob | Buffer;
    duration: number;        // seconds
    mimeType: string;        // e.g., 'audio/m4a'
  };

  /**
   * Auto-collected device and app context
   */
  context: DeviceContext;

  /**
   * User-defined metadata
   */
  customMetadata?: Record<string, unknown>;
}
```

### ReportInput
User input from the report form.

```typescript
interface ReportInput {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  email?: string;           // Submitter email (optional)
  attachAudio?: boolean;    // Include audio in report (if recorded)
}
```

### CaptureResult
Output from the capture plugin.

```typescript
interface CaptureResult {
  /**
   * Screenshot data as base64 string or Blob
   */
  imageData: string | Blob;

  /**
   * Screenshot dimensions
   */
  dimensions: {
    width: number;
    height: number;
  };

  /**
   * MIME type of image
   */
  mimeType: 'image/png' | 'image/jpeg';
}
```

### DeviceContext
Auto-collected contextual information about device and app.

```typescript
interface DeviceContext {
  /**
   * Platform information
   */
  platform?: {
    /**
     * Operating system
     */
    os: 'ios' | 'android' | 'web';

    /**
     * OS version
     */
    version?: string;

    /**
     * User agent string (web only)
     */
    userAgent?: string;
  };

  /**
   * Screen information
   */
  screen?: {
    resolution: {
      width: number;
      height: number;
    };

    /**
     * Device pixel ratio
     */
    pixelRatio: number;

    /**
     * Current orientation
     */
    orientation: 'portrait' | 'landscape';
  };

  /**
   * Network connectivity
   */
  network?: {
    /**
     * Connection type
     */
    type: 'wifi' | 'cellular' | 'unknown';

    /**
     * Online status
     */
    online: boolean;
  };

  /**
   * Battery status (mobile only)
   */
  battery?: {
    /**
     * Battery percentage (0-100)
     */
    level: number;

    /**
     * Device charging
     */
    charging: boolean;
  };

  /**
   * Locale and timezone
   */
  locale?: {
    /**
     * Language code (e.g., 'en-US')
     */
    language: string;

    /**
     * IANA timezone (e.g., 'America/New_York')
     */
    timezone: string;

    /**
     * Full locale (e.g., 'en-US')
     */
    locale: string;
  };

  /**
   * Performance metrics (web only)
   */
  performance?: {
    /**
     * Memory usage
     */
    memory?: {
      used: number;   // bytes
      total: number;  // bytes
    };

    /**
     * Page load time (ms)
     */
    pageLoadTime?: number;

    /**
     * Largest Contentful Paint (ms)
     */
    lcp?: number;

    /**
     * First Contentful Paint (ms)
     */
    fcp?: number;
  };

  /**
   * Browser console logs (web only)
   */
  console?: {
    logs: Array<{
      level: 'log' | 'warn' | 'error' | 'info';
      message: string;
      timestamp: number;  // milliseconds since epoch
    }>;
  };

  /**
   * Application-level information
   */
  app?: {
    /**
     * Current URL (web) or deep link (mobile)
     */
    url?: string;

    /**
     * Current route/screen
     */
    route?: string;

    /**
     * Referrer URL (web only)
     */
    referrer?: string;

    /**
     * Page title (web) or screen name (mobile)
     */
    title?: string;

    /**
     * Application version
     */
    version?: string;
  };
}
```

### SubmitResult
Result of successful issue submission.

```typescript
interface SubmitResult {
  /**
   * URL to the created issue
   */
  url: string;

  /**
   * Issue ID
   */
  id: string;

  /**
   * Success flag
   */
  success: true;
}
```

### ShakeNbakeError
Typed error with specific error codes.

```typescript
class ShakeNbakeError extends Error {
  /**
   * Error category code
   */
  code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'UPLOAD_FAILED' | 'NETWORK_ERROR';

  /**
   * Original error (if wrapped)
   */
  originalError?: unknown;

  constructor(message: string, code: ShakeNbakeErrorCode, options?: { originalError?: unknown });
}
```

## Plugin Interfaces

### TriggerPlugin
Initiates the bug report flow.

```typescript
interface TriggerPlugin {
  /**
   * Unique plugin name
   */
  readonly name: string;

  /**
   * Activate trigger listener
   * @param onTrigger Callback when triggered
   */
  activate(onTrigger: () => void): Promise<void>;

  /**
   * Deactivate trigger listener
   */
  deactivate(): void;
}
```

### CapturePlugin
Captures a screenshot.

```typescript
interface CapturePlugin {
  /**
   * Unique plugin name
   */
  readonly name: string;

  /**
   * Platform this plugin targets
   */
  readonly platform: 'web' | 'react-native';

  /**
   * Capture screenshot
   */
  capture(): Promise<CaptureResult>;
}
```

### ContextCollector
Collects contextual information.

```typescript
interface ContextCollector {
  /**
   * Unique collector name
   */
  readonly name: string;

  /**
   * Collect context data
   */
  collect(): Promise<Partial<DeviceContext>>;
}
```

### DestinationAdapter
Sends the report to a destination (Linear, GitHub, Jira, etc.).

```typescript
interface DestinationAdapter {
  /**
   * Unique adapter name
   */
  readonly name: string;

  /**
   * Upload screenshot image to file storage
   * @param imageData Screenshot as Blob or Buffer
   * @param filename Suggested filename
   * @return URL to uploaded image
   */
  uploadImage(imageData: Blob | Buffer, filename: string): Promise<string>;

  /**
   * Create issue with report data
   * @param report Complete bug report
   * @return Submission result with URL and ID
   */
  createIssue(report: BugReport): Promise<SubmitResult>;

  /**
   * Test connection to destination
   * @return true if connected and authenticated
   */
  testConnection(): Promise<boolean>;
}
```

## Flow State Machine (React Native)

```typescript
type FlowStep =
  | 'idle'
  | 'triggered'
  | 'capturing'
  | 'annotating'
  | 'form'
  | 'submitting'
  | 'success'
  | 'error';

interface FlowState {
  step: FlowStep;
  data: {
    captureResult?: CaptureResult;
    context?: DeviceContext;
    annotatedScreenshot?: string;  // base64
    originalScreenshot?: string;   // base64
    submitResult?: SubmitResult;
    error?: string;
  };
}

type FlowAction =
  | { type: 'TRIGGER' }
  | { type: 'CAPTURE_START' }
  | { type: 'CAPTURE_DONE'; captureResult: CaptureResult; context: DeviceContext }
  | { type: 'CAPTURE_ERROR'; error: string }
  | { type: 'ANNOTATE_DONE'; annotatedScreenshot: string; originalScreenshot: string }
  | { type: 'ANNOTATE_CANCEL' }
  | { type: 'RE_ANNOTATE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_DONE'; result: SubmitResult }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };
```

## Hook Types

### useShakeNbake
```typescript
interface UseShakeNbakeResult {
  /**
   * Programmatically trigger report flow
   */
  trigger: () => void;

  /**
   * Is the report UI currently open
   */
  isOpen: boolean;

  /**
   * Current flow step
   */
  currentStep: FlowStep;

  /**
   * Access to configuration
   */
  config: ShakeNbakeConfig;
}
```

## Enum Values

### Severity Levels
```typescript
type Severity = 'critical' | 'high' | 'medium' | 'low';
```

- **critical**: System breaking, blocks all work
- **high**: Major functionality broken
- **medium**: Feature partially broken or significant UX issue
- **low**: Minor issue, cosmetic, or enhancement request

### Platform Types
```typescript
type Platform = 'web' | 'react-native';
```

### Log Levels
```typescript
type LogLevel = 'log' | 'warn' | 'error' | 'info';
```

### Network Types
```typescript
type NetworkType = 'wifi' | 'cellular' | 'unknown';
```

## Environment Variable Schema

### Web (Next.js)
```
LINEAR_API_KEY: string                    # Linear API key (server-side)
LINEAR_TEAM_ID: string                   # Linear team UUID
```

### React Native (Expo)
```
EXPO_PUBLIC_LINEAR_API_KEY: string        # Linear API key (public, in binary)
EXPO_PUBLIC_LINEAR_TEAM_ID: string        # Linear team UUID
```

## Default Values

### ShakeNbakeConfig Defaults
```typescript
{
  enabled: true,
  ui: {
    theme: 'dark',
    position: 'bottom-right'
  },
  privacy: {
    redactFields: []
  }
}
```

### DeviceContext Collection
- Timeout: 5 seconds per collector
- Failure handling: Swallow errors, continue with partial context
- Merge strategy: Last-write-wins for duplicate keys

### Screenshot Dimensions
- Maximum size: No hard limit (device-dependent)
- Format: PNG (lossless, better for annotations)
- Quality: 100% (no compression on PNG)
