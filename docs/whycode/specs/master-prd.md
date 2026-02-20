# ShakeNbake v0.1 MVP -- Master Specification

## Status: Planning

## Overview

ShakeNbake is an open-source (MIT), cross-platform bug reporting SDK. Users shake their device or press a keyboard shortcut to capture a screenshot, annotate it, and submit a bug report as a Linear issue. The v0.1 MVP delivers the core plugin system, Linear integration, web SDK, React Native SDK, example apps, and a mock adapter for testing.

## Vision

Every bug reporting SDK for mobile and web apps is either prohibitively expensive ($160-$340/month), locked to a single issue tracker, closed-source, or missing key features like screenshot annotation and audio narration. ShakeNbake is the free, open-source, plugin-based alternative that goes from `npm install` to a working shake-to-report flow in under 5 minutes.

## Design Principles

1. **Open source, always.** MIT-licensed. No freemium gating.
2. **Plugin architecture.** Issue trackers, platforms, and context collectors are all swappable.
3. **Zero-config sensible defaults.** Working flow in under 5 minutes.
4. **Maximum context, minimum effort.** Auto-collect everything the developer needs to reproduce the bug.
5. **Privacy-first.** Transparent, configurable data collection. Nothing sent without explicit configuration.

## Target Users

- **Primary:** Mobile and web developers who want in-app bug reporting for internal QA, beta testing, and dogfooding without paying $200/month.
- **Secondary:** Open-source contributors who want to add support for their preferred issue tracker or platform.

## v0.1 MVP Scope

### What Is Included

| # | Feature | Package | Spec |
|---|---------|---------|------|
| 1 | Core Plugin System | `@shakenbake/core` | [core-plugin-system.md](../features/core-plugin-system.md) |
| 2 | Linear Adapter | `@shakenbake/linear` | [linear-adapter.md](../features/linear-adapter.md) |
| 3 | Web SDK | `@shakenbake/web` | [web-sdk.md](../features/web-sdk.md) |
| 4 | React Native SDK | `@shakenbake/react-native` | [react-native-sdk.md](../features/react-native-sdk.md) |
| 5 | Example Apps | `examples/expo-app`, `examples/nextjs-app` | [example-apps.md](../features/example-apps.md) |
| 6 | MockAdapter | `@shakenbake/core` (built-in) | [mock-adapter.md](../features/mock-adapter.md) |

### What Is NOT Included (Deferred to v0.2+)

- Audio recording and playback (interfaces defined in v0.1, implementation in v0.2)
- ShakeNbake Cloud hosted platform (v0.2)
- Cloud client SDK (`@shakenbake/cloud-client`) (v0.2)
- Whisper audio transcription (v0.2)
- Stripe billing (v0.2)
- GitHub Issues adapter (v0.3)
- Jira adapter (v1.0)
- Video recording (v0.3)
- Network request log capture (v0.3)
- Redux/Zustand state snapshot capture (v0.3)
- Customizable report form fields (v0.3)
- i18n support (v0.3)

## Build Order

Each step depends on the previous. Steps 3 and 4 can be built in parallel once steps 1 and 2 are complete.

```
1. @shakenbake/core          Foundation: types, interfaces, ReportBuilder, errors
       |
2. @shakenbake/linear        First adapter: enables end-to-end testing
       |
   +---+---+
   |       |
3. web  4. react-native      Platform SDKs (parallel after core+linear)
   |       |
   +---+---+
       |
5. Example apps              Expo + Next.js demos
       |
6. MockAdapter               Testing without Linear (can also be built earlier)
```

## Architecture Summary

### Monorepo (Turborepo)

```
shakenbake/
  packages/
    core/              # Platform-agnostic types, plugin interfaces, report builder
    react-native/      # Expo SDK (shake, view-shot, Skia annotation)
    web/               # Web SDK (keyboard/FAB, html2canvas, Canvas annotation)
    linear/            # Linear GraphQL adapter
  examples/
    expo-app/          # Example Expo app
    nextjs-app/        # Example Next.js app
```

### Plugin System (4 Interfaces)

| Interface | Purpose | Implementations in v0.1 |
|-----------|---------|------------------------|
| `TriggerPlugin` | Initiates the report flow | Shake (RN), Keyboard shortcut (web), FAB (web), Programmatic (both) |
| `CapturePlugin` | Takes the screenshot | react-native-view-shot (RN), html2canvas-pro (web) |
| `ContextCollector` | Gathers device/app data | Expo modules (RN), Browser APIs (web) |
| `DestinationAdapter` | Sends the report | LinearAdapter, MockAdapter, ProxyAdapter (web) |

### Data Flow

```
Trigger (shake / shortcut / FAB / programmatic)
  -> Screenshot capture (view-shot / html2canvas)
  -> Annotation overlay (Skia / Canvas)
  -> Report form (pre-filled with auto-collected context)
  -> Submit via DestinationAdapter
  -> Confirmation with issue link
```

### Error Handling

All adapters throw typed `ShakeNbakeError` with codes:
- `AUTH_FAILED` -- invalid API key (not retryable)
- `RATE_LIMITED` -- too many requests (retryable)
- `UPLOAD_FAILED` -- screenshot upload failed (retryable, falls back to base64)
- `NETWORK_ERROR` -- offline or unreachable (retryable, queued locally)
- `UNKNOWN` -- unexpected error

Failed submissions queue locally (AsyncStorage on RN, localStorage on web) and retry on reconnect.

## Security Model

| Deployment | API Key Location | Risk Level |
|------------|-----------------|------------|
| Web + server proxy (recommended) | Server-side only | Low |
| React Native direct | Compiled into binary | Medium |
| ShakeNbake Cloud (v0.2) | Server-side only | Low |

The web SDK includes a `ProxyAdapter` that sends reports to a developer's own API endpoint (e.g., `/api/shakenbake`), which then forwards to Linear server-side. This keeps the Linear API key off the client bundle.

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Skia for RN annotation | 60fps GPU-accelerated drawing; same engine as Chrome and Android |
| html2canvas-pro for web screenshots | No permission dialog; captures page content only |
| Expo SDK 52+ dev builds required | Native modules (react-native-shake, Skia) need native code |
| Server-side proxy for web | Keeps Linear API key off the client bundle |
| Turborepo monorepo | Coordinated releases, shared types, single CI pipeline |
| Plain fetch for Linear API | No GraphQL client dependency; keeps bundle small |
| MockAdapter in core | Zero dependencies, universally useful, trivially available |

## Key Dependencies

### React Native SDK
| Package | Purpose |
|---------|---------|
| `react-native-shake` | Shake gesture detection |
| `react-native-view-shot` | Screenshot capture |
| `@shopify/react-native-skia` | Annotation canvas |
| `expo-device` | Device info |
| `expo-battery` | Battery info |
| `expo-network` | Network info |
| `expo-localization` | Locale/timezone |
| `expo-screen-orientation` | Orientation |
| `expo-constants` | App version/build |
| `@react-native-community/netinfo` | Network details |

### Web SDK
| Package | Purpose |
|---------|---------|
| `html2canvas-pro` | Screenshot capture |
| Native Canvas API | Annotation |
| Native Navigator API | Device/browser info |
| Native Performance API | Performance metrics |

### Linear Adapter
| Package | Purpose |
|---------|---------|
| Native `fetch` | GraphQL API calls (no external dependency) |

## Success Criteria for v0.1

1. A developer can install the web SDK, wrap their Next.js app, and submit a bug report to Linear in under 5 minutes
2. A developer can install the RN SDK, run an Expo dev build, shake their device, and submit an annotated bug report to Linear
3. The Linear issue contains: annotated screenshot, original screenshot, user-provided title/description, severity, category, and a collapsible device context table
4. The MockAdapter allows the full flow to work without any API keys
5. Both example apps run successfully and demonstrate the complete flow
6. All TypeScript interfaces are well-defined and exported from `@shakenbake/core`
7. Error handling works correctly: network errors queue locally, auth errors show clear messages
