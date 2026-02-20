# Architecture Overview

## Package Dependency Graph

```
@shakenbake/web ────────> @shakenbake/core <──────── @shakenbake/react-native
                               ^
                               |
                     @shakenbake/linear
                     @shakenbake/cloud-client
                     (future adapters)
```

All arrows point inward toward core. No package depends on a sibling. Core has zero runtime dependencies.

## Plugin System

Four interfaces defined in `@shakenbake/core`:

```
TriggerPlugin        -> activate(onTrigger) / deactivate()
CapturePlugin        -> capture() -> CaptureResult
ContextCollector     -> collect() -> Record<string, unknown>
DestinationAdapter   -> uploadImage() / createIssue() / testConnection()
```

Each plugin declares `name` and `platform` ('react-native' | 'web' | 'universal').

## Data Flow

```
1. Trigger fires
   TriggerPlugin.activate(callback) invokes callback
        |
        v
2. Screenshot captured
   CapturePlugin.capture() -> { base64, width, height, uri? }
        |
        v
3. Annotation overlay
   Platform UI (Skia on RN, Canvas on web)
   User draws freehand, arrows, rectangles, text
   -> annotated image (base64)
        |
        v
4. Context collected
   ContextCollector[].collect() -> merged DeviceContext
        |
        v
5. Report form
   Platform UI (ReportForm component)
   User enters: title, description, severity, category
        |
        v
6. Report built
   ReportBuilder.build({
     title, description, severity, category,
     screenshot: { original, annotated, dimensions },
     context: mergedDeviceContext,
     customMetadata: config.customMetadata?.()
   }) -> BugReport
        |
        v
7. Submitted
   DestinationAdapter.uploadImage(annotated) -> imageUrl
   DestinationAdapter.createIssue(report) -> { url, id }
        |
        v
8. Result
   Success: show confirmation with issue link
   Failure: queue in local storage, retry on reconnect
```

## Key Classes

### ReportBuilder (core)

Orchestrates report assembly. Does not own UI.

```typescript
class ReportBuilder {
  constructor(registry: PluginRegistry, destination: DestinationAdapter)

  startCapture(): Promise<CaptureResult>
  collectContext(): Promise<DeviceContext>
  build(input: ReportInput): BugReport
  submit(report: BugReport): Promise<SubmitResult>
}
```

### PluginRegistry (core)

Stores plugins by type. Platform providers register defaults at init.

```typescript
class PluginRegistry {
  registerTrigger(plugin: TriggerPlugin): void
  registerCapture(plugin: CapturePlugin): void
  registerCollector(plugin: ContextCollector): void
  getTriggers(): TriggerPlugin[]
  getCapture(): CapturePlugin | undefined
  getCollectors(): ContextCollector[]
  clear(): void
}
```

### ShakeNbakeProvider (web & react-native)

React context provider. The public API surface for each platform SDK.

1. Accepts ShakeNbakeConfig
2. Creates PluginRegistry with platform-default plugins
3. Creates ReportBuilder
4. Activates triggers on mount, deactivates on unmount
5. Provides ShakeNbakeContext to children (trigger, isOpen, report state)

### ShakeNbakeError (core)

Typed error class for all adapter failures.

```typescript
class ShakeNbakeError extends Error {
  code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'UPLOAD_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN'
  retryable: boolean
  originalError?: unknown
}
```

## Error Handling & Retry

- Adapters throw ShakeNbakeError on failure (never return silently)
- testConnection() returns false on auth failure (does not throw)
- Failed submissions are serialized and queued:
  - React Native: AsyncStorage
  - Web: localStorage
- Queue is drained on reconnect (navigator.onLine / NetInfo)
- Retryable errors (NETWORK_ERROR, RATE_LIMITED) are retried with exponential backoff
- Non-retryable errors (AUTH_FAILED) surface a user-facing message

## Package Internal Structure

Each platform SDK follows this layout:

```
src/
  ShakeNbakeProvider.tsx    # Provider component (public API)
  triggers/                 # TriggerPlugin implementations
  capture/                  # CapturePlugin implementation
  annotate/                 # Annotation UI (Skia or Canvas)
  audio/                    # Audio recording (v0.2)
  ui/                       # ReportForm, ReportModal
  context/                  # ContextCollector implementations
  index.ts                  # Public exports
```

## Configuration

```typescript
interface ShakeNbakeConfig {
  enabled: boolean                          // Master kill switch
  destination: DestinationAdapter           // Where reports go
  triggers?: TriggerPlugin[]                // Custom triggers (platform defaults used if omitted)
  contextCollectors?: ContextCollector[]    // Additional collectors
  customMetadata?: () => Record<string, unknown>

  ui?: {
    theme?: 'light' | 'dark' | 'auto'
    accentColor?: string
    position?: 'bottom-right' | 'bottom-left'
    showFAB?: boolean
  }

  audio?: {
    enabled: boolean
    maxDurationMs: number                   // Default: 60000
  }

  privacy?: {
    redactFields?: string[]
    requireConsent?: boolean
    stripPersonalData?: boolean
  }
}
```

## Security Model

| Deployment | API Key Location | Risk |
|---|---|---|
| Web + server proxy | Server-side only | Low |
| Web + direct | Client bundle (exposed) | High (not recommended) |
| React Native | Env var compiled into binary | Medium |
| ShakeNbake Cloud | Cloud server-side, client gets scoped write-only key | Low |

## MVP Scope (v0.1)

Included: triggers, screenshot capture, annotation (freehand + shapes), report form, Linear adapter, context collection, error handling, local retry queue, MockAdapter.

Excluded (v0.2+): audio recording, audio transcription, Cloud platform, Stripe billing.

## Related Documents

- [ADR-001: Tech Stack](../adr/ADR-001-tech-stack.md)
- [ADR-002: Architecture](../adr/ADR-002-architecture.md)
- [Full PRD](../ShakeNbake-PRD.md)
- [Discovery Findings](../whycode/discovery/DISCOVERY.md)
