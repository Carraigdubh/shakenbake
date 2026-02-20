# ADR-002: Architecture

## Status
Accepted

## Date
2026-02-20

## Context
ShakeNbake needs a software architecture that supports cross-platform bug reporting (React Native + Web), a plugin system with four extension points, independently publishable packages, and a clear data flow from trigger to issue creation. The architecture must balance extensibility with pragmatic simplicity for a v0.1 MVP.

We evaluated three approaches:
- **Minimal:** Single package, no plugin system, Linear-only. Fast to build but locks in decisions and makes future adapters painful.
- **Maximal:** Full DI container, event bus, middleware chains, abstract factories. Highly extensible but over-engineered for the current scope.
- **Balanced:** Plugin interfaces in core, concrete implementations in platform packages, ReportBuilder as orchestrator. Extensible where it matters, simple where it does not.

## Decision

We adopt the **Balanced** architecture approach.

### Package Dependency Graph

```
@shakenbake/web -----> @shakenbake/core <----- @shakenbake/react-native
                           ^
                           |
                    @shakenbake/linear
                    @shakenbake/cloud-client
                    (any future adapter)
```

All dependency arrows point inward toward `core`. Platform SDKs (web, react-native) and destination adapters (linear, cloud-client) depend on core, never on each other. Core has zero runtime dependencies on any platform or adapter package.

### Plugin System (4 Interfaces in Core)

Core defines four plugin interfaces. Each plugin declares its name and platform compatibility. Implementations live in platform-specific packages.

| Interface | Responsibility | Implementations |
|---|---|---|
| `TriggerPlugin` | Initiates the report flow | ShakeTrigger (RN), KeyboardTrigger (web), FABTrigger (web), ProgrammaticTrigger (universal) |
| `CapturePlugin` | Takes the screenshot | ViewShotCapture (RN), Html2CanvasCapture (web) |
| `ContextCollector` | Gathers device/app data | DeviceContextCollector (RN), BrowserContextCollector (web) |
| `DestinationAdapter` | Sends the report | LinearAdapter, CloudAdapter, MockAdapter, ProxyAdapter |

### ReportBuilder as Orchestrator

The `ReportBuilder` class in core orchestrates the full report flow. It does not own any UI — platform SDKs provide UI components (annotation canvas, report form, provider) that call into ReportBuilder at the right time.

```
ReportBuilder flow:
1. Trigger fires            -> TriggerPlugin.activate(callback)
2. Capture screenshot       -> CapturePlugin.capture() -> CaptureResult
3. User annotates           -> Platform UI (Skia or Canvas) -> annotated image
4. Collect context          -> ContextCollector[].collect() -> merged context
5. User fills form          -> Platform UI (ReportForm) -> title, description, severity, category
6. Build report             -> ReportBuilder.build() -> BugReport
7. Submit                   -> DestinationAdapter.uploadImage() + .createIssue()
8. Handle result/error      -> Success confirmation or queue for retry
```

### PluginRegistry

A simple registry in core that stores plugins by type and name. Platform providers register their default plugins at initialization. Developers can override or add plugins via config.

```typescript
class PluginRegistry {
  registerTrigger(plugin: TriggerPlugin): void;
  registerCapture(plugin: CapturePlugin): void;
  registerCollector(plugin: ContextCollector): void;
  getTriggers(): TriggerPlugin[];
  getCapture(): CapturePlugin | undefined;
  getCollectors(): ContextCollector[];
  clear(): void;
}
```

### Error Handling Strategy

All adapters throw `ShakeNbakeError` with typed error codes. The error class carries:
- `code`: `AUTH_FAILED | RATE_LIMITED | UPLOAD_FAILED | NETWORK_ERROR | UNKNOWN`
- `retryable`: boolean indicating whether automatic retry is appropriate
- `originalError`: the underlying error for debugging

Failed submissions are queued in local storage (AsyncStorage on RN, localStorage on web) and retried on reconnect or next app launch.

### Shared Types Flow

All TypeScript types and interfaces are defined in `@shakenbake/core` and imported by every other package. This guarantees type consistency across the monorepo. Key shared types:
- `BugReport` — the complete report object
- `ShakeNbakeConfig` — the main configuration surface
- `CaptureResult` — screenshot data from capture plugins
- `DeviceContext` — all sub-context interfaces (platform, device, screen, network, battery, locale, app, accessibility, performance, navigation, console)
- Plugin interfaces (TriggerPlugin, CapturePlugin, ContextCollector, DestinationAdapter)
- `ShakeNbakeError` — typed error class

### Platform SDK Structure

Each platform SDK (web, react-native) follows the same internal structure:
```
src/
  ShakeNbakeProvider.tsx   # React context provider, wires everything together
  triggers/               # TriggerPlugin implementations
  capture/                # CapturePlugin implementation
  annotate/               # Annotation UI component (Skia or Canvas)
  audio/                  # Audio recording component (v0.2)
  ui/                     # ReportForm, ReportModal
  context/                # ContextCollector implementations
```

The `ShakeNbakeProvider` is the public API surface for each SDK. It:
1. Accepts `ShakeNbakeConfig`
2. Creates a PluginRegistry and registers default plugins for the platform
3. Creates a ReportBuilder with the registry and destination adapter
4. Activates triggers
5. Provides context (via React Context) to child UI components

### Package Publishing

Each package is independently publishable to npm:
- `@shakenbake/core` — zero dependencies, universal
- `@shakenbake/linear` — depends on core only, universal
- `@shakenbake/web` — depends on core, peer-depends on React 18+
- `@shakenbake/react-native` — depends on core, peer-depends on React Native + Expo modules

Coordinated releases via changesets ensure version compatibility across packages.

## Consequences

### Positive
- Core has zero platform dependencies, enabling any future platform SDK (Flutter, SwiftUI)
- Plugin interfaces are simple (1-3 methods each), lowering the barrier for community contributors
- ReportBuilder is testable in isolation with mock plugins
- Each package can be installed independently (e.g., use core + linear without any SDK for a custom integration)
- Dependency direction is strict and one-way, preventing circular dependencies

### Negative
- Platform SDKs must duplicate some structural patterns (provider, form, annotation) rather than sharing UI code
- The plugin registry is a simple map, not a full dependency injection container (intentional trade-off for v0.1 simplicity)
- Audio recording (v0.2) will require additions to BugReport type and ReportBuilder flow, but the types are designed with optional audio fields to accommodate this
