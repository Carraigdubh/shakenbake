# ShakeNbake - Technical Specification

## Technology Stack

### Core Stack
- **Language**: TypeScript (strict mode)
- **Package Manager**: Yarn (v4)
- **Monorepo**: Turborepo
- **Testing**: Vitest with 80%+ coverage target

### Web SDK
- **Framework**: React 18+
- **Bundler**: Vite (via Turborepo build pipeline)
- **Screenshot**: html2canvas
- **Annotation**: Canvas API (HTML5)
- **State Management**: React Context + useReducer

### React Native SDK
- **Framework**: React Native (Expo SDK 52+)
- **Build System**: Expo (development builds required)
- **Screenshot**: react-native-view-shot
- **Annotation**: Skia (@shopify/react-native-skia)
- **Shake Detection**: react-native-shake
- **Audio**: expo-av (planned)

### Linear Adapter
- **GraphQL Client**: Apollo Client or fetch-based
- **API Version**: Linear v1 GraphQL API

### Cloud Version (Planned)
- **Frontend**: Next.js 15 (App Router)
- **Hosting**: Vercel
- **Auth**: Clerk
- **Database**: PostgreSQL (Neon/Supabase)
- **ORM**: Prisma or Drizzle
- **File Storage**: Vercel Blob
- **Audio Transcription**: OpenAI Whisper API
- **Payments**: Stripe

## Package Structure

### @shakenbake/core (v0.0.2+)
Core types, plugin interfaces, and shared utilities.

**Key Exports**:
- `ShakeNbakeConfig`: Main configuration interface
- `PluginRegistry`: Manages plugin lifecycle
- `ReportBuilder`: Builds and submits bug reports
- `TriggerPlugin`, `CapturePlugin`, `ContextCollector`, `DestinationAdapter`: Plugin interfaces
- `BugReport`, `DeviceContext`, `CaptureResult`: Data types
- `ShakeNbakeError`: Typed error class
- `MockAdapter`: Mock destination for testing

**Key Changes (fix-01, fix-02)**:
- `PluginRegistry.activateTriggers()` is now `async`
- Per-trigger error handling with console logging
- No breaking changes to type definitions

### @shakenbake/web
Web SDK for React applications.

**Key Exports**:
- `ShakeNbakeProvider`: Context provider component
- `useShakeNbake()`: Hook for programmatic trigger access
- `KeyboardTrigger`: Keyboard shortcut trigger (Ctrl+Shift+K)
- `FABTrigger`: Floating Action Button trigger
- `BrowserCollector`: Auto-collects browser context
- `ProxyAdapter`: Server-side proxy for API calls

**Features**:
- html2canvas for screenshot capture
- Canvas API for annotation overlay
- Responsive form UI
- Dark/light theme support
- Privacy field redaction

### @shakenbake/react-native
React Native SDK for Expo applications.

**Key Exports**:
- `ShakeNbakeProvider`: Context provider component
- `useShakeNbake()`: Hook for programmatic trigger access
- `ShakeTrigger`: Device shake detection trigger
- `ViewShotCapture`: Screenshot capture plugin
- `DeviceContextCollector`: Auto-collects device context
- `DrawingCanvas`: Skia-powered annotation component

**Features**:
- react-native-view-shot for screenshot capture
- Skia GPU-accelerated annotation (60fps)
- Device shake detection via native module
- Android GL surface screenshot fix (fix-02)
- Audio recording support (planned)

**Key Changes (fix-02)**:
- `ViewShotCapture.capture()` now passes `handleGLSurfaceViewOnAndroid: true` on Android
- Fixes blank/incomplete screenshots with GL-rendered surfaces

**Requirements for Installation**:
- Requires Expo development build (not Expo Go)
- Peer dependencies: `react-native-shake`, `react-native-view-shot`, `@shopify/react-native-skia`
- Autolinking workaround for monorepo: `react-native.config.js` in app root

### @shakenbake/linear
Linear GraphQL adapter for issue creation.

**Key Exports**:
- `LinearAdapter`: Destination adapter for Linear

**Features**:
- GraphQL API integration
- Issue creation with file uploads
- Automatic team and project resolution
- API key validation

### @shakenbake/cloud-client (Planned)
Client SDK for ShakeNbake Cloud SaaS version.

**Planned Features**:
- Integration with hosted ShakeNbake platform
- Workspace management
- Usage analytics

## Data Types

### BugReport
```typescript
interface BugReport {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  screenshot: {
    annotated: Blob | Buffer;
    original: Blob | Buffer;
    dimensions: { width: number; height: number };
  };
  audio?: {
    data: Blob | Buffer;
    duration: number;
    mimeType: string;
  };
  context: DeviceContext;
  customMetadata?: Record<string, unknown>;
}
```

### DeviceContext
```typescript
interface DeviceContext {
  platform?: {
    os: 'ios' | 'android' | 'web';
    version?: string;
    userAgent?: string;
  };
  screen?: {
    resolution: { width: number; height: number };
    pixelRatio: number;
    orientation: 'portrait' | 'landscape';
  };
  network?: {
    type: 'wifi' | 'cellular' | 'unknown';
    online: boolean;
  };
  battery?: {
    level: number;
    charging: boolean;
  };
  locale?: {
    language: string;
    timezone: string;
    locale: string;
  };
  performance?: {
    memory?: { used: number; total: number };
    pageLoadTime?: number;
    lcp?: number;
    fcp?: number;
  };
  console?: {
    logs: Array<{ level: string; message: string; timestamp: number }>;
  };
  app?: {
    url?: string;
    route?: string;
    referrer?: string;
    title?: string;
    version?: string;
  };
}
```

### CaptureResult
```typescript
interface CaptureResult {
  imageData: string | Blob;
  dimensions: { width: number; height: number };
  mimeType: string;
}
```

### ShakeNbakeError
```typescript
class ShakeNbakeError extends Error {
  code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'UPLOAD_FAILED' | 'NETWORK_ERROR';
  originalError?: unknown;
}
```

## Plugin Interfaces

### TriggerPlugin
```typescript
interface TriggerPlugin {
  readonly name: string;
  activate(onTrigger: () => void): Promise<void>;
  deactivate(): void;
}
```

Implementations:
- **ShakeTrigger** (React Native): Detects device shake via react-native-shake
- **KeyboardTrigger** (Web): Listens for Ctrl+Shift+K
- **FABTrigger** (Web): Floating Action Button
- **Custom**: Users can implement for custom activation

### CapturePlugin
```typescript
interface CapturePlugin {
  readonly name: string;
  readonly platform: Platform;
  capture(): Promise<CaptureResult>;
}
```

Implementations:
- **ViewShotCapture** (React Native): Uses react-native-view-shot
- **Html2CanvasCapture** (Web): Uses html2canvas library
- **Custom**: Users can implement custom capture methods

### ContextCollector
```typescript
interface ContextCollector {
  readonly name: string;
  collect(): Promise<Partial<DeviceContext>>;
}
```

Implementations:
- **DeviceContextCollector** (React Native): Collects platform, screen, battery, etc.
- **BrowserCollector** (Web): Collects browser context, console logs, performance metrics
- **Custom**: Domain-specific collectors (user ID, feature flags, etc.)

### DestinationAdapter
```typescript
interface DestinationAdapter {
  readonly name: string;
  uploadImage(imageData: Blob | Buffer, filename: string): Promise<string>;
  createIssue(report: BugReport): Promise<{ url: string; id: string }>;
  testConnection(): Promise<boolean>;
}
```

Implementations:
- **LinearAdapter**: Linear GraphQL API
- **ProxyAdapter** (Web): Server-side proxy pattern
- **MockAdapter**: In-memory mock for testing
- **Custom**: GitHub, Jira, Slack, internal systems, etc.

## State Machine (React Native)

The ShakeNbakeProvider uses a state machine to manage the bug report flow:

```
idle
  ↓ (user triggers)
triggered
  ↓ (capture starts)
capturing
  ↓ (capture completes)
annotating
  ↓ (annotation done)
form
  ↓ (user submits)
submitting
  ↓ (success)
success
  ↓ (dismiss)
idle

error (can occur from: capturing, submitting)
  ↓ (retry with form data)
form
  ↓ (or reset without form data)
idle
```

## Error Handling Strategy

### Async Trigger Activation (fix-01)
- `PluginRegistry.activateTriggers()` is now `async` and `await`ed in Provider
- Each trigger activation wrapped in try-catch
- Errors logged to console but don't block other triggers
- Allows graceful degradation if one trigger fails

### Android GL Screenshot Fix (fix-02)
- Detect platform: `Platform.OS === 'android'`
- Pass `handleGLSurfaceViewOnAndroid: true` to `captureRef()`
- Fixes blank screenshots when Skia/MapView/camera previews present
- No user configuration needed (automatic)

## API Endpoints (Web SDK)

### POST /api/shakenbake (Server-side proxy)
**Request**:
```json
{
  "title": "Login button not working",
  "description": "Button stays disabled",
  "severity": "high",
  "screenshot": {
    "annotated": "base64-string",
    "original": "base64-string",
    "dimensions": { "width": 1920, "height": 1080 }
  },
  "context": { "platform": { "os": "web" }, ... }
}
```

**Response**:
```json
{
  "url": "https://linear.app/project/issue/123",
  "id": "issue-123",
  "success": true
}
```

## Testing Strategy

### Unit Tests
- Plugin interfaces and implementations
- State machine reducer logic
- Data collection and validation
- Error handling paths

### Integration Tests
- Full flow: trigger → capture → form → submit
- Mock adapter for end-to-end testing without real Linear API
- Provider lifecycle and cleanup

### E2E Tests (Manual for now)
- Real device/browser testing
- Screenshot capture and annotation
- Linear issue creation

### Coverage Target
- Core package: 85%+
- SDK packages: 80%+
- Excludes: React Native components (hard to test in jsdom)

## Build and Release Process

### Monorepo Build
```bash
npx turbo build          # Build all packages
npx turbo test          # Run all tests
npx turbo typecheck     # Type check all packages
```

### Release Management
- Changesets for version tracking
- Coordinated releases across packages
- Semantic versioning (MAJOR.MINOR.PATCH)

### npm Publishing
- Scoped package: `@shakenbake/*`
- Auto-publish on merge to main
- GitHub Actions CI/CD

## Deployment Checklist

### Web Applications
- [ ] Install @shakenbake/web and @shakenbake/linear
- [ ] Create server-side proxy endpoint
- [ ] Configure Linear API key in environment
- [ ] Wrap application with ShakeNbakeProvider
- [ ] Test with development server
- [ ] Deploy to production

### Mobile Applications
- [ ] Install @shakenbake/react-native and @shakenbake/linear
- [ ] Install peer dependencies via Expo
- [ ] Configure Linear API key in .env
- [ ] Wrap application with ShakeNbakeProvider
- [ ] Create react-native.config.js if needed
- [ ] Build dev client: `npx expo prebuild --clean && npx expo run:ios`
- [ ] Test shake detection and full flow
- [ ] Deploy to TestFlight/internal testing

### Cloud Version (Future)
- [ ] PostgreSQL database setup
- [ ] Clerk authentication setup
- [ ] Vercel environment variables configured
- [ ] Stripe account linked
- [ ] OpenAI Whisper API key configured
- [ ] Deploy to Vercel
