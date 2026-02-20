# ShakeNbake — Product Requirements Document

**Version:** 1.0.0
**Author:** Martin Quinlan
**Status:** Draft
**License:** MIT
**Last Updated:** 2026-02-20

---

## 1. Vision & Overview

### The Problem

Every bug reporting SDK for mobile and web apps is either prohibitively expensive ($160–$340/month), locked to a single issue tracker, closed-source, or missing key features like screenshot annotation and audio narration. Developers on indie teams and startups are stuck choosing between a clunky DIY solution and a SaaS tool that costs more than their hosting.

### The Solution

**ShakeNbake** is a fully open-source, cross-platform bug reporting SDK that lets users shake their device (or trigger via keyboard shortcut on web) to capture a screenshot, annotate it, record an optional audio narration, and submit a bug report — which lands directly as an issue in Linear (or any other issue tracker via plugins).

### Design Principles

- **Open source, always.** Every package in the ShakeNbake ecosystem is MIT-licensed. No freemium gating, no "enterprise" features behind a paywall.
- **Plugin architecture.** Issue trackers (Linear, GitHub Issues, Jira), platforms (React Native, web, Flutter), and context collectors are all swappable plugins. Build what you need, ignore the rest.
- **Zero-config sensible defaults.** A developer should go from `npm install` to a working shake-to-report flow in under 5 minutes.
- **Maximum context, minimum effort.** Automatically collect every piece of device, network, and app context available — so the developer receiving the report has everything they need without asking follow-up questions.
- **Privacy-first.** All data collection is transparent and configurable. Sensitive fields can be redacted. Nothing is sent anywhere without explicit configuration.

### Who Is This For?

- **Primary:** Mobile and web developers who want in-app bug reporting for internal QA, beta testing, and dogfooding — without paying $200/month.
- **Secondary:** Open-source contributors who want to add support for their preferred issue tracker or platform.
- **Tertiary:** Teams who want a hosted solution without self-managing infrastructure (ShakeNbake Cloud).

---

## 2. Quick Start

### React Native (Expo)

> **Important:** ShakeNbake requires an Expo development build. It will not work with Expo Go because `react-native-shake` and `@shopify/react-native-skia` require native modules.

```bash
# 1. Install packages
npx expo install @shakenbake/react-native @shakenbake/core @shakenbake/linear

# 2. Run prebuild (generates native projects)
npx expo prebuild --clean

# 3. Add environment variable to .env.local
EXPO_PUBLIC_LINEAR_API_KEY=lin_api_xxxxx

# 4. Wrap your app root
```

```typescript
// App.tsx
import { ShakeNbakeProvider } from '@shakenbake/react-native';
import { LinearAdapter } from '@shakenbake/linear';

export default function App() {
  return (
    <ShakeNbakeProvider
      config={{
        enabled: __DEV__,
        destination: new LinearAdapter({
          apiKey: process.env.EXPO_PUBLIC_LINEAR_API_KEY!,
          teamId: 'your-team-id',  // Find via Linear: Cmd+K → "Copy model UUID"
        }),
      }}
    >
      <YourApp />
    </ShakeNbakeProvider>
  );
}
```

```bash
# 5. Run on device and shake to test
npx expo run:ios   # or npx expo run:android
```

### Web (Next.js)

```bash
# 1. Install packages
npm install @shakenbake/web @shakenbake/core @shakenbake/linear

# 2. Add environment variables to .env.local
NEXT_PUBLIC_SHAKENBAKE=true
LINEAR_API_KEY=lin_api_xxxxx       # Keep server-side only
LINEAR_TEAM_ID=your-team-id

# 3. Create a server-side API proxy (keeps API key off the client)
```

```typescript
// app/api/shakenbake/route.ts — proxies reports to Linear server-side
import { LinearAdapter } from '@shakenbake/linear';
import { NextRequest, NextResponse } from 'next/server';

const linear = new LinearAdapter({
  apiKey: process.env.LINEAR_API_KEY!,
  teamId: process.env.LINEAR_TEAM_ID!,
});

export async function POST(req: NextRequest) {
  const report = await req.json();
  const result = await linear.createIssue(report);
  return NextResponse.json(result);
}
```

```typescript
// app/layout.tsx — wrap your app
import { ShakeNbakeProvider } from '@shakenbake/web';
import { ProxyAdapter } from '@shakenbake/web/adapters';

export default function Layout({ children }) {
  return (
    <ShakeNbakeProvider
      config={{
        enabled: process.env.NEXT_PUBLIC_SHAKENBAKE === 'true',
        destination: new ProxyAdapter({ endpoint: '/api/shakenbake' }),
        ui: { showFAB: true, position: 'bottom-right' },
      }}
    >
      {children}
    </ShakeNbakeProvider>
  );
}
```

```bash
# 4. Run and press Cmd+Shift+K (or click the FAB) to test
npm run dev
```

### Verifying It Works

After setup, trigger a report and check:
- Screenshot appears with annotation tools
- Drawing on the screenshot works (freehand, arrows, etc.)
- Submit creates an issue in your Linear team
- Issue contains annotated screenshot, device context, and console errors

### Permissions Required

| Permission | Platform | When |
|---|---|---|
| Microphone | iOS, Android, Web | Only when audio recording is enabled and user taps record |
| Motion & Fitness | iOS | Shake detection (automatic permission prompt) |

No permissions are required for screenshot capture, device info collection, or report submission.

---

## 3. Architecture

### Package Structure

```
@shakenbake/core                 # Platform-agnostic engine
@shakenbake/react-native         # Expo / React Native SDK
@shakenbake/web                  # Next.js / any web framework SDK
@shakenbake/linear               # Linear issue tracker adapter
@shakenbake/github               # GitHub Issues adapter (future)
@shakenbake/jira                 # Jira adapter (future)
@shakenbake/cloud-client         # Client SDK for ShakeNbake Cloud hosted version
```

### Monorepo Layout

```
shakenbake/
├── packages/
│   ├── core/                    # Shared types, plugin system, report builder
│   │   ├── src/
│   │   │   ├── types.ts         # Report, Plugin, Adapter interfaces
│   │   │   ├── report-builder.ts# Assembles report from context + user input
│   │   │   ├── plugin-registry.ts# Registers and manages plugins
│   │   │   └── context/
│   │   │       ├── types.ts     # ContextCollector interface
│   │   │       └── base.ts      # Shared context (timestamp, app version, etc.)
│   │   └── package.json
│   │
│   ├── react-native/            # Expo / React Native SDK
│   │   ├── src/
│   │   │   ├── ShakeNbakeProvider.tsx  # React context provider
│   │   │   ├── triggers/
│   │   │   │   └── shake.ts           # Shake gesture detection
│   │   │   ├── capture/
│   │   │   │   └── screenshot.ts      # react-native-view-shot wrapper
│   │   │   ├── annotate/
│   │   │   │   └── DrawingCanvas.tsx   # Skia-based annotation overlay
│   │   │   ├── audio/
│   │   │   │   └── AudioRecorder.tsx   # expo-av audio recording
│   │   │   ├── ui/
│   │   │   │   ├── ReportModal.tsx     # Bug report form modal
│   │   │   │   └── AnnotationScreen.tsx# Screenshot + drawing + audio
│   │   │   └── context/
│   │   │       └── collectors.ts       # RN-specific device context
│   │   └── package.json
│   │
│   ├── web/                     # Web SDK (Next.js, React, any SPA)
│   │   ├── src/
│   │   │   ├── ShakeNbakeProvider.tsx  # React context provider
│   │   │   ├── triggers/
│   │   │   │   ├── keyboard.ts        # Keyboard shortcut trigger
│   │   │   │   └── fab.tsx            # Floating action button trigger
│   │   │   ├── capture/
│   │   │   │   └── screenshot.ts      # html2canvas wrapper
│   │   │   ├── annotate/
│   │   │   │   └── DrawingCanvas.tsx   # HTML5 Canvas annotation overlay
│   │   │   ├── audio/
│   │   │   │   └── AudioRecorder.tsx   # MediaRecorder API
│   │   │   ├── ui/
│   │   │   │   ├── ReportModal.tsx     # Bug report form modal
│   │   │   │   └── AnnotationScreen.tsx# Screenshot + drawing + audio
│   │   │   └── context/
│   │   │       └── collectors.ts       # Browser-specific device context
│   │   └── package.json
│   │
│   ├── linear/                  # Linear adapter
│   │   ├── src/
│   │   │   ├── adapter.ts       # Implements DestinationAdapter interface
│   │   │   ├── graphql.ts       # issueCreate + fileUpload mutations
│   │   │   └── config.ts        # Linear API key, team, project, label config
│   │   └── package.json
│   │
│   └── cloud-client/            # Client SDK for hosted version
│       ├── src/
│       │   ├── adapter.ts       # Implements DestinationAdapter (sends to Cloud API)
│       │   └── config.ts        # Cloud API key, app ID
│       └── package.json
│
├── apps/
│   └── cloud/                   # ShakeNbake Cloud — hosted Next.js app (Vercel)
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/
│       │   │   │   ├── reports/         # Report ingestion API
│       │   │   │   ├── transcribe/      # Whisper audio transcription
│       │   │   │   └── webhooks/        # Forward to Linear/GitHub/Jira
│       │   │   ├── dashboard/           # Multi-tenant dashboard
│       │   │   │   ├── apps/            # App management
│       │   │   │   ├── reports/         # Report viewer
│       │   │   │   ├── settings/        # Issue tracker config
│       │   │   │   └── team/            # Team/user management
│       │   │   └── auth/                # Authentication (Clerk or NextAuth)
│       │   └── lib/
│       │       ├── transcription.ts     # OpenAI Whisper integration
│       │       └── forwarding.ts        # Issue tracker forwarding logic
│       └── package.json
│
├── docs/                        # Documentation site
├── examples/
│   ├── expo-app/                # Example Expo app with ShakeNbake
│   └── nextjs-app/              # Example Next.js app with ShakeNbake
└── package.json                 # Monorepo root (turborepo or nx)
```

### Plugin System

The architecture is built around four plugin interfaces. Contributors can implement any of these to extend ShakeNbake:

```typescript
// TRIGGERS — what initiates the bug report flow
interface TriggerPlugin {
  name: string;
  platform: 'react-native' | 'web' | 'universal';
  activate(onTrigger: () => void): void;
  deactivate(): void;
}

// CAPTURE — how the screenshot is taken
interface CapturePlugin {
  name: string;
  platform: 'react-native' | 'web' | 'universal';
  capture(): Promise<CaptureResult>;  // returns base64 image + dimensions
}

// CONTEXT COLLECTORS — what device/app data is gathered
interface ContextCollector {
  name: string;
  platform: 'react-native' | 'web' | 'universal';
  collect(): Promise<Record<string, unknown>>;
}

// DESTINATION ADAPTERS — where the report is sent
interface DestinationAdapter {
  name: string;
  uploadImage(imageData: Buffer | Blob, filename: string): Promise<string>;  // returns URL
  createIssue(report: BugReport): Promise<{ url: string; id: string }>;
  testConnection(): Promise<boolean>;
}
```

### Data Flow

```
User triggers report (shake / shortcut / FAB)
        │
        ▼
Screenshot captured (view-shot / html2canvas)
        │
        ▼
Annotation overlay appears (Skia / Canvas)
  ├── User draws on screenshot (freehand, arrows, rectangles, text)
  ├── User optionally records audio narration
  └── User taps "Next"
        │
        ▼
Report form appears (pre-filled with context)
  ├── Title (required)
  ├── Description (optional, auto-filled from audio transcript if available)
  ├── Severity picker (low / medium / high / critical)
  ├── Category picker (bug / UI / crash / performance / other)
  └── Auto-collected device context (read-only, collapsible)
        │
        ▼
Submit
  ├── Annotated screenshot uploaded to destination
  ├── Audio uploaded to Cloud for transcription (if using Cloud)
  │     └── Transcript appended to issue description async
  ├── Issue created in Linear (or other configured destination)
  └── Confirmation shown with issue link
```

---

## 4. Core Package (`@shakenbake/core`)

### Responsibilities

- Define all shared TypeScript interfaces and types
- Plugin registration and lifecycle management
- Report assembly (merge user input + context + screenshot + audio into a single `BugReport` object)
- Validation and sanitization of report data
- Feature flag support (enable/disable ShakeNbake at runtime)

### Key Types

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
  customMetadata?: Record<string, unknown>;  // App-specific data from developers
}

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

### Configuration

```typescript
interface ShakeNbakeConfig {
  enabled: boolean;                           // Master kill switch
  destination: DestinationAdapter;            // Where reports go
  triggers?: TriggerPlugin[];                 // What activates the flow
  contextCollectors?: ContextCollector[];     // Additional context plugins
  customMetadata?: () => Record<string, unknown>;  // App-specific data hook

  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    accentColor?: string;
    position?: 'bottom-right' | 'bottom-left';  // FAB position (web)
    showFAB?: boolean;                           // Show floating button (web)
  };

  audio?: {
    enabled: boolean;                  // Enable audio annotations
    maxDurationMs: number;             // Max recording length (default: 60000)
  };

  privacy?: {
    redactFields?: string[];           // CSS selectors or RN testIDs to auto-blur
    requireConsent?: boolean;          // Show consent prompt before first report
    stripPersonalData?: boolean;       // Remove emails, IPs from context
  };
}
```

---

## 5. React Native Package (`@shakenbake/react-native`)

### Platform Requirements

- Expo SDK 52+ (development build required — not Expo Go)
- React Native 0.76+
- React Native New Architecture supported

### Trigger: Shake Detection

Uses `react-native-shake` to detect device shake gesture. Configurable sensitivity threshold. Also supports a programmatic trigger for custom UI (e.g. a debug menu button).

```typescript
// In app entry point
import { ShakeNbakeProvider } from '@shakenbake/react-native';
import { LinearAdapter } from '@shakenbake/linear';

export default function App() {
  return (
    <ShakeNbakeProvider
      config={{
        enabled: __DEV__,  // Only in development by default
        destination: new LinearAdapter({
          apiKey: process.env.EXPO_PUBLIC_LINEAR_API_KEY,
          teamId: 'your-team-id',
        }),
        audio: { enabled: true, maxDurationMs: 60000 },
      }}
    >
      <YourApp />
    </ShakeNbakeProvider>
  );
}
```

### Screenshot Capture

Uses `react-native-view-shot` to capture the current screen. The provider wraps the app's root view in a capturable container. Captures at device resolution.

### Annotation Canvas

Built with `@shopify/react-native-skia` for performant 60fps drawing. The annotation screen overlays the captured screenshot with drawing tools:

**Drawing tools:**
- Freehand pen (multiple colors, adjustable stroke width)
- Arrow tool (drag to draw directional arrows)
- Rectangle/oval highlight tool
- Text label tool
- Eraser
- Undo/redo

**Color palette:** Red (default), yellow, blue, green, white, black

### Audio Recording

Uses `expo-av` for audio recording. UI shows a hold-to-record button or a toggle record button. Visual waveform feedback during recording. Maximum duration configurable (default 60 seconds). Output format: M4A (iOS) / WebM (Android).

### Device Context Collection (React Native)

The following data is automatically collected on every report:

**Platform**
| Field | Source | Example |
|---|---|---|
| `platform.os` | `Platform.OS` | `"ios"` |
| `platform.osVersion` | `Platform.Version` | `"17.2"` |
| `platform.sdkVersion` | `expo-constants` | `"52.0.0"` |
| `platform.runtimeVersion` | `expo-constants` | `"1.0.0"` |
| `platform.isEmulator` | `expo-device` | `false` |

**Device**
| Field | Source | Example |
|---|---|---|
| `device.manufacturer` | `expo-device` | `"Apple"` |
| `device.model` | `expo-device` | `"iPhone 15 Pro"` |
| `device.modelId` | `expo-device` | `"iPhone16,1"` |
| `device.deviceType` | `expo-device` | `"phone"` |
| `device.totalMemory` | `expo-device` | `6442450944` |
| `device.deviceName` | `expo-device` | `"Martin's iPhone"` |

**Screen**
| Field | Source | Example |
|---|---|---|
| `screen.width` | `Dimensions` | `393` |
| `screen.height` | `Dimensions` | `852` |
| `screen.scale` | `PixelRatio` | `3` |
| `screen.fontScale` | `PixelRatio` | `1.0` |
| `screen.orientation` | `expo-screen-orientation` | `"portrait"` |

**Network**
| Field | Source | Example |
|---|---|---|
| `network.type` | `@react-native-community/netinfo` | `"wifi"` |
| `network.isConnected` | `@react-native-community/netinfo` | `true` |
| `network.isInternetReachable` | `@react-native-community/netinfo` | `true` |
| `network.cellularGeneration` | `@react-native-community/netinfo` | `"4g"` |
| `network.ipAddress` | `expo-network` | `"192.168.1.42"` |
| `network.isAirplaneMode` | `expo-network` | `false` |

**Battery**
| Field | Source | Example |
|---|---|---|
| `battery.level` | `expo-battery` | `0.72` |
| `battery.state` | `expo-battery` | `"charging"` |
| `battery.lowPowerMode` | `expo-battery` | `false` |

**Locale**
| Field | Source | Example |
|---|---|---|
| `locale.languageCode` | `expo-localization` | `"en"` |
| `locale.regionCode` | `expo-localization` | `"GB"` |
| `locale.currencyCode` | `expo-localization` | `"GBP"` |
| `locale.timezone` | `expo-localization` | `"Europe/London"` |
| `locale.isRTL` | `expo-localization` | `false` |
| `locale.measurementSystem` | `expo-localization` | `"metric"` |
| `locale.temperatureUnit` | `expo-localization` | `"celsius"` |

**App**
| Field | Source | Example |
|---|---|---|
| `app.version` | `expo-constants` | `"1.2.3"` |
| `app.buildNumber` | `expo-constants` | `"42"` |
| `app.bundleId` | `expo-constants` | `"com.twinklin.app"` |
| `app.installationId` | `expo-constants` | `"uuid"` |
| `app.updateId` | `expo-updates` | `"uuid"` |

**Accessibility**
| Field | Source | Example |
|---|---|---|
| `accessibility.fontScale` | `PixelRatio.getFontScale()` | `1.0` |
| `accessibility.screenReaderEnabled` | `AccessibilityInfo` | `false` |
| `accessibility.reduceMotionEnabled` | `AccessibilityInfo` | `false` |
| `accessibility.boldTextEnabled` | `AccessibilityInfo` (iOS) | `false` |
| `accessibility.invertColorsEnabled` | `AccessibilityInfo` (iOS) | `false` |

**Performance**
| Field | Source | Example |
|---|---|---|
| `performance.memoryUsage` | `react-native-device-info` | `142000000` |
| `performance.appUptime` | Custom timer | `3600000` |
| `performance.jsBundleLoadTime` | Custom timer | `1200` |

**Navigation**
| Field | Source | Example |
|---|---|---|
| `navigation.currentRoute` | React Navigation state | `"BookingDetails"` |
| `navigation.routeParams` | React Navigation state | `{ bookingId: "abc" }` |
| `navigation.navigationHistory` | Custom tracker (last 10) | `["Home", "Browse", ...]` |

**Console**
| Field | Source | Example |
|---|---|---|
| `console.recentLogs` | Console interceptor (last 50) | `[{ level, message, timestamp }]` |
| `console.recentErrors` | Console interceptor (last 20) | `[{ message, stack, timestamp }]` |

---

## 6. Web Package (`@shakenbake/web`)

### Platform Requirements

- React 18+ (works with Next.js 14+, Vite, CRA, or any React setup)
- Modern browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)

### Triggers

**Keyboard shortcut** (default: `Ctrl+Shift+K` / `Cmd+Shift+K`):
Globally registered, configurable key combination. Shown in a small tooltip on hover over the FAB.

**Floating Action Button (FAB):**
Optional persistent button in the corner of the viewport. Positioned bottom-right by default, configurable. Shows the ShakeNbake icon. Only visible when `enabled: true`.

**Programmatic trigger:**
```typescript
import { useShakeNbake } from '@shakenbake/web';
const { trigger } = useShakeNbake();
<button onClick={trigger}>Report Bug</button>
```

### Screenshot Capture

Uses `html2canvas` to capture the current viewport. Handles scroll position, fixed elements, and iframes where possible. Falls back gracefully if capture fails (allows user to paste/upload a screenshot manually).

### Annotation Canvas

Built with HTML5 Canvas API. Same tools as React Native version: freehand pen, arrows, rectangles, text labels, eraser, undo/redo. Same color palette. Responsive to mouse and touch input.

### Audio Recording

Uses the browser `MediaRecorder` API. Same UX as React Native: hold-to-record or toggle button. Visual waveform feedback via Web Audio API `AnalyserNode`. Output format: WebM (Opus codec). Requires user permission for microphone access (handled via `navigator.mediaDevices.getUserMedia`).

### Usage

```typescript
// In app root (e.g. _app.tsx or layout.tsx)
import { ShakeNbakeProvider } from '@shakenbake/web';
import { LinearAdapter } from '@shakenbake/linear';

export default function Layout({ children }) {
  return (
    <ShakeNbakeProvider
      config={{
        enabled: process.env.NEXT_PUBLIC_SHAKENBAKE === 'true',
        destination: new LinearAdapter({
          apiKey: process.env.LINEAR_API_KEY,  // Server-side proxy recommended
          teamId: 'your-team-id',
        }),
        audio: { enabled: true, maxDurationMs: 60000 },
        ui: { showFAB: true, position: 'bottom-right' },
      }}
    >
      {children}
    </ShakeNbakeProvider>
  );
}
```

### Device Context Collection (Web)

**Platform**
| Field | Source | Example |
|---|---|---|
| `platform.userAgent` | `navigator.userAgent` | `"Mozilla/5.0 ..."` |
| `platform.browser` | Parsed from UA / `navigator.userAgentData` | `"Chrome 122"` |
| `platform.os` | Parsed from UA / `navigator.userAgentData` | `"macOS 14.3"` |
| `platform.engine` | Parsed from UA | `"Blink"` |
| `platform.isMobile` | `navigator.userAgentData?.mobile` | `false` |

**Screen**
| Field | Source | Example |
|---|---|---|
| `screen.width` | `window.screen.width` | `1920` |
| `screen.height` | `window.screen.height` | `1080` |
| `screen.viewportWidth` | `window.innerWidth` | `1440` |
| `screen.viewportHeight` | `window.innerHeight` | `900` |
| `screen.devicePixelRatio` | `window.devicePixelRatio` | `2` |
| `screen.orientation` | `screen.orientation.type` | `"landscape-primary"` |
| `screen.colorDepth` | `screen.colorDepth` | `24` |
| `screen.touchSupport` | `navigator.maxTouchPoints` | `0` |

**Network**
| Field | Source | Example |
|---|---|---|
| `network.online` | `navigator.onLine` | `true` |
| `network.effectiveType` | `navigator.connection?.effectiveType` | `"4g"` |
| `network.downlink` | `navigator.connection?.downlink` | `10` |
| `network.rtt` | `navigator.connection?.rtt` | `50` |
| `network.saveData` | `navigator.connection?.saveData` | `false` |

**Battery** (where supported)
| Field | Source | Example |
|---|---|---|
| `battery.level` | `navigator.getBattery()` | `0.85` |
| `battery.charging` | `navigator.getBattery()` | `true` |
| `battery.chargingTime` | `navigator.getBattery()` | `3600` |
| `battery.dischargingTime` | `navigator.getBattery()` | `Infinity` |

**Locale**
| Field | Source | Example |
|---|---|---|
| `locale.languages` | `navigator.languages` | `["en-GB", "en"]` |
| `locale.timezone` | `Intl.DateTimeFormat().resolvedOptions().timeZone` | `"Europe/London"` |
| `locale.timezoneOffset` | `new Date().getTimezoneOffset()` | `0` |

**App / Page**
| Field | Source | Example |
|---|---|---|
| `app.url` | `window.location.href` | `"https://twinklin.com/book"` |
| `app.pathname` | `window.location.pathname` | `"/book"` |
| `app.referrer` | `document.referrer` | `"https://google.com"` |
| `app.title` | `document.title` | `"Book a Cleaner"` |

**Accessibility**
| Field | Source | Example |
|---|---|---|
| `accessibility.prefersReducedMotion` | `matchMedia('prefers-reduced-motion')` | `false` |
| `accessibility.prefersColorScheme` | `matchMedia('prefers-color-scheme')` | `"light"` |
| `accessibility.prefersContrast` | `matchMedia('prefers-contrast')` | `"no-preference"` |
| `accessibility.forcedColors` | `matchMedia('forced-colors')` | `"none"` |

**Performance**
| Field | Source | Example |
|---|---|---|
| `performance.pageLoadTime` | `Performance API` | `1200` |
| `performance.domContentLoaded` | `Performance API` | `800` |
| `performance.firstContentfulPaint` | `Performance API` | `450` |
| `performance.largestContentfulPaint` | `Performance API` | `900` |
| `performance.memoryUsage` | `performance.memory` (Chrome) | `{ usedJSHeapSize: ... }` |

**Console**
| Field | Source | Example |
|---|---|---|
| `console.recentLogs` | Console interceptor (last 50) | `[{ level, message, timestamp }]` |
| `console.recentErrors` | Console interceptor (last 20) | `[{ message, stack, timestamp }]` |
| `console.unhandledRejections` | `window.onunhandledrejection` (last 10) | `[{ reason, timestamp }]` |

**Network Requests** (optional, opt-in)
| Field | Source | Example |
|---|---|---|
| `network.recentRequests` | Fetch/XHR interceptor (last 20) | `[{ url, method, status, duration }]` |
| `network.failedRequests` | Fetch/XHR interceptor (last 10) | `[{ url, method, status, error }]` |

---

## 7. Linear Adapter (`@shakenbake/linear`)

### Overview

The Linear adapter implements the `DestinationAdapter` interface and uses Linear's GraphQL API to create issues with attached screenshots and full device context.

### Authentication

Supports two modes:

- **API Key** (for internal/private use): Pass a Linear personal API key directly. Suitable for internal QA tools where the key is kept server-side or in environment variables.
- **OAuth2** (for ShakeNbake Cloud): Standard OAuth flow for multi-tenant hosted version where each user connects their own Linear workspace.

### Configuration

```typescript
import { LinearAdapter } from '@shakenbake/linear';

const linear = new LinearAdapter({
  apiKey: 'lin_api_xxxxx',           // or use OAuth token
  teamId: 'team-uuid',               // Required: which team to create issues in
  projectId: 'project-uuid',         // Optional: assign to a project
  defaultLabelIds: ['label-uuid'],   // Optional: auto-apply labels (e.g. "bug-report")
  defaultAssigneeId: 'user-uuid',    // Optional: auto-assign
  defaultPriority: 2,                // Optional: 0=none, 1=urgent, 2=high, 3=medium, 4=low

  // Map ShakeNbake severity to Linear priority
  severityMapping: {
    critical: 1,  // Urgent
    high: 2,      // High
    medium: 3,    // Medium
    low: 4,       // Low
  },

  // Map ShakeNbake category to Linear label IDs
  categoryLabels: {
    bug: 'label-uuid-bug',
    ui: 'label-uuid-ui',
    crash: 'label-uuid-crash',
    performance: 'label-uuid-perf',
  },
});
```

### Issue Creation Flow

1. **Upload annotated screenshot** via Linear's `fileUpload` mutation → receive signed upload URL → PUT image → receive `assetUrl`
2. **Upload original screenshot** (same flow) for comparison
3. **Upload audio file** (if present) via same flow
4. **Create issue** via `issueCreate` mutation with:
   - `title`: User-provided title
   - `description`: Markdown body containing user description, embedded screenshot, audio link, and a collapsible device context section
   - `teamId`, `projectId`, `labelIds`, `assigneeId`, `priority`: From config + severity mapping

### Issue Description Template

```markdown
## Bug Report

{user_description}

{audio_transcript_if_available}

### Screenshots

**Annotated:**
![Annotated screenshot]({annotated_screenshot_url})

**Original:**
![Original screenshot]({original_screenshot_url})

{audio_attachment_link_if_available}

### Device Context

<details>
<summary>Full device and environment details</summary>

| Field | Value |
|---|---|
| Platform | {platform.os} {platform.osVersion} |
| Device | {device.manufacturer} {device.model} |
| Screen | {screen.width}x{screen.height} @{screen.scale}x |
| Network | {network.type} ({network.effectiveType}) |
| Battery | {battery.level}% ({battery.state}) |
| Locale | {locale.languageCode}-{locale.regionCode} |
| Timezone | {locale.timezone} |
| App Version | {app.version} ({app.buildNumber}) |
| Current Route | {navigation.currentRoute} |

</details>

### Console Errors (last 5)

{formatted_recent_errors}

---
*Reported via [ShakeNbake](https://github.com/user/shakenbake)*
```

---

## 8. ShakeNbake Cloud (Hosted Platform)

### Overview

ShakeNbake Cloud is a hosted Next.js application deployed on Vercel that provides a managed bug reporting service for teams who don't want to self-host or manage API keys client-side. It adds multi-tenant user management, app management, server-side audio transcription, and a web dashboard for viewing and triaging reports.

**Pricing:** $10/month per workspace (unlimited apps, unlimited reports, unlimited team members).

### Tech Stack

- **Framework:** Next.js (App Router)
- **Hosting:** Vercel
- **Database:** Postgres (via Neon or Supabase) with Prisma or Drizzle ORM
- **Authentication:** Clerk (multi-tenant with organizations)
- **File Storage:** Vercel Blob or AWS S3
- **Audio Transcription:** OpenAI Whisper API
- **Queue:** Vercel serverless functions with async processing (or Inngest/Trigger.dev for reliability)
- **Issue Tracker Forwarding:** Linear API (v1), extensible to GitHub Issues, Jira

### Multi-Tenant Architecture

```
Workspace (1 per paying customer)
├── Team Members (unlimited, role-based: owner, admin, member)
├── Apps (unlimited)
│   ├── App Name, Platform (iOS, Android, Web)
│   ├── API Key (generated per app, used by cloud-client SDK)
│   └── Issue Tracker Config (Linear team, labels, etc.)
└── Reports (unlimited)
    ├── Screenshot + annotations
    ├── Audio recording + transcript
    ├── Device context
    └── Forwarding status (sent to Linear, link to issue)
```

### API Endpoints

**Report Ingestion:**
- `POST /api/reports` — Receives bug report from `@shakenbake/cloud-client`. Authenticated via app API key. Accepts multipart form data (JSON report + image + audio files). Returns report ID.

**Audio Transcription Pipeline:**
- On report ingestion, if audio is attached:
  1. Audio file stored in blob storage
  2. Async job queued for Whisper transcription
  3. Transcript stored against report
  4. If issue tracker is configured, the existing issue is updated with the transcript appended to the description
  5. Webhook/callback notifies dashboard of transcript completion

**Issue Forwarding:**
- `POST /api/webhooks/forward` — After report is processed (and optionally transcribed), forwards to configured issue tracker using the appropriate adapter (Linear, GitHub, Jira).

### Dashboard Pages

| Route | Purpose |
|---|---|
| `/dashboard` | Overview: recent reports, stats, quick actions |
| `/dashboard/apps` | List and manage apps, generate API keys |
| `/dashboard/apps/[appId]` | App settings, issue tracker config |
| `/dashboard/reports` | Filterable list of all reports across apps |
| `/dashboard/reports/[reportId]` | Report detail: screenshot, annotations, audio player, transcript, device context, linked issue |
| `/dashboard/team` | Invite members, manage roles |
| `/dashboard/settings` | Workspace settings, billing, integrations |

### Audio Transcription Detail

The key differentiator of the hosted version is server-side audio processing:

1. **Recording:** User records audio on device (up to 60 seconds)
2. **Upload:** Audio file sent to Cloud API as part of report submission
3. **Storage:** Stored in Vercel Blob / S3 with presigned URL for playback
4. **Transcription:** Whisper API processes the audio (typical latency: 2–5 seconds for 60s audio)
5. **Enhancement:** Transcript is cleaned and formatted, then:
   - Stored against the report in the database
   - Appended to the Linear issue description as an "Audio Narration" section
   - Available for playback alongside transcript in the dashboard
6. **Cost:** Whisper API pricing is ~$0.006/minute of audio. At 60-second recordings, that's $0.006 per report. Even at 1,000 reports/month, transcription costs ~$6.

### Cloud Client SDK Usage

```typescript
// Instead of @shakenbake/linear, use @shakenbake/cloud-client
import { ShakeNbakeProvider } from '@shakenbake/react-native';
import { CloudAdapter } from '@shakenbake/cloud-client';

export default function App() {
  return (
    <ShakeNbakeProvider
      config={{
        enabled: __DEV__,
        destination: new CloudAdapter({
          apiKey: 'snb_app_xxxxx',  // From ShakeNbake Cloud dashboard
          endpoint: 'https://cloud.shakenbake.dev/api',
        }),
        audio: { enabled: true, maxDurationMs: 60000 },
      }}
    >
      <YourApp />
    </ShakeNbakeProvider>
  );
}
```

---

## 9. Security & API Key Management

### The Problem

Bug reporting SDKs need API keys to create issues in Linear (or other trackers). Exposing these keys in client-side bundles is a security risk — anyone could extract the key and create issues, exhaust rate limits, or access your workspace data.

### Recommended Approaches by Deployment Mode

**Self-hosted (Direct to Linear):**

| Approach | Security | Complexity | When to Use |
|---|---|---|---|
| Server-side proxy (recommended) | High | Medium | Production apps, beta programs |
| Environment variable | Medium | Low | Internal-only QA, dev builds |
| ShakeNbake Cloud | High | Low | Don't want to manage infra |

The **server-side proxy** pattern (shown in Quick Start §2) is the recommended approach for self-hosted web apps. The API key lives server-side, and the client sends reports to your own `/api/shakenbake` endpoint. For React Native, since the key is compiled into the app binary (not served to a browser), the risk is lower — but still recommended to proxy for production.

**ShakeNbake Cloud:**

The Cloud adapter uses a ShakeNbake-issued API key (`snb_app_xxxxx`) scoped to a single app. This key can only submit reports — it cannot read, modify, or delete anything. The Linear API key is stored server-side in Cloud and never exposed to clients.

### Error Handling Contract

All adapters must follow this error handling contract:

```typescript
interface DestinationAdapter {
  // Throws ShakeNbakeError on failure — never returns silently
  uploadImage(imageData: Buffer | Blob, filename: string): Promise<string>;
  createIssue(report: BugReport): Promise<{ url: string; id: string }>;
  testConnection(): Promise<boolean>;  // Returns false (not throws) on auth failure
}

class ShakeNbakeError extends Error {
  code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'UPLOAD_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN';
  retryable: boolean;
  originalError?: unknown;
}
```

The SDK handles errors gracefully in the UI:
- **Network offline:** "You're offline. Report saved locally — it will be submitted when you reconnect."
- **Auth failed:** "Unable to submit report. Check your API key configuration."
- **Rate limited:** "Too many reports submitted. Please try again in a moment."
- **Upload failed:** Screenshot is embedded as base64 in the issue description as a fallback.

Reports that fail to submit are queued in local storage (AsyncStorage on RN, localStorage on web) and retried on next app launch or when connectivity is restored.

---

## 10. Privacy & Data Handling

> **Note:** This section is a placeholder for detailed privacy requirements to be defined before v1 launch. The following outlines the intended approach.

### Principles

- All data collection is transparent — developers can inspect exactly what is collected
- All context collectors are individually disableable
- Screenshot redaction: developers can mark sensitive UI elements (via CSS class or RN testID) to be auto-blurred in screenshots
- **Audio handling by deployment mode:**
  - **ShakeNbake Cloud:** Audio uploaded to Cloud API, transcribed via Whisper, transcript appended to issue
  - **Self-hosted with proxy:** Audio file uploaded directly to Linear as an attachment (no transcription). Developers can optionally add their own Whisper endpoint to the proxy for self-hosted transcription
  - **Self-hosted direct (no proxy):** Audio file uploaded to Linear as an attachment via the `fileUpload` mutation. The issue description includes an "Audio Narration" section with a link to the audio file but no transcript
- No analytics or telemetry is collected by ShakeNbake itself
- GDPR, CCPA, and other privacy regulation compliance will be addressed in a dedicated privacy specification

### Configurable Redaction

```typescript
// React Native: blur elements with testID="sensitive"
<TextInput testID="sensitive-credit-card" ... />

// Web: blur elements with data-shakenbake-redact
<input data-shakenbake-redact type="password" ... />

// Config
{
  privacy: {
    redactSelectors: ['[data-shakenbake-redact]'],  // Web
    redactTestIDs: ['sensitive-credit-card'],         // React Native
    stripPersonalData: true,  // Remove IPs, device names
  }
}
```

---

## 11. Contributing

### How to Add a New Destination Adapter

1. Create a new package: `packages/your-tracker/`
2. Implement the `DestinationAdapter` interface from `@shakenbake/core`
3. Implement `uploadImage()` — upload screenshot to the tracker's file storage and return a URL
4. Implement `createIssue()` — create an issue/ticket with the report data and return the issue URL
5. Implement `testConnection()` — verify credentials are valid
6. Add configuration types and documentation
7. Submit a PR with an example in `examples/`

### How to Add a New Platform SDK

1. Create a new package: `packages/your-platform/`
2. Implement platform-specific versions of:
   - Trigger plugin (how users initiate a report)
   - Capture plugin (how screenshots are taken)
   - Context collectors (what device data is available)
   - UI components (annotation overlay, report form)
3. Use `@shakenbake/core` for shared types and report building
4. Submit a PR with an example app in `examples/`

### How to Add a New Context Collector

1. Implement the `ContextCollector` interface
2. Return a flat or nested object of key-value pairs
3. Specify which platform(s) it supports
4. Register it in the provider config
5. Submit a PR with documentation of what data is collected and why

---

## 12. Roadmap

### v0.1 — MVP (You Are Here)

**Build order** (each step depends on the previous):

1. `@shakenbake/core` — types, plugin interfaces, report builder (foundation for everything)
2. `@shakenbake/linear` — Linear adapter (needed to test end-to-end)
3. `@shakenbake/web` — keyboard shortcut, FAB, html2canvas, canvas annotation, report modal, full browser context (faster iteration cycle than mobile)
4. `@shakenbake/react-native` — shake trigger, screenshot, annotation canvas, report modal, full device context (build after web validates the flow)
5. Example apps (Expo + Next.js) and documentation
6. `MockAdapter` for testing (logs reports to console, returns fake issue URLs)

Steps 3 and 4 can be built in parallel once `core` and `linear` are done.

### v0.2 — Audio & Cloud

- [ ] Audio recording on React Native (`expo-av`) and web (`MediaRecorder`)
- [ ] `@shakenbake/cloud-client` — cloud adapter SDK
- [ ] ShakeNbake Cloud — report ingestion API, Whisper transcription, Linear forwarding
- [ ] Cloud dashboard — report viewer, app management, team management
- [ ] Stripe billing integration ($10/mo per workspace)

### v0.3 — Polish & Ecosystem

- [ ] Video recording option (short screen recordings)
- [ ] Network request log capture (opt-in)
- [ ] Redux/Zustand state snapshot capture (opt-in plugin)
- [ ] React Navigation / Next.js router automatic route tracking
- [ ] `@shakenbake/github` — GitHub Issues adapter
- [ ] Customizable report form fields
- [ ] i18n support for report UI

### v1.0 — Production Ready

- [ ] Comprehensive test suite
- [ ] Performance benchmarks (SDK overhead < 5ms on report trigger)
- [ ] Privacy specification and GDPR compliance documentation
- [ ] Security audit of data handling
- [ ] `@shakenbake/jira` — Jira adapter
- [ ] Documentation site with interactive examples
- [ ] npm publish with CI/CD pipeline

### Future Ideas (Community-Driven)

- Additional platform SDKs: Flutter, SwiftUI, Kotlin
- Additional destination adapters: Slack, Discord, Notion
- AI-powered duplicate detection and automatic severity classification
- Session replay integration (LogRocket, Sentry, etc.)

---

## 13. Technical Decisions & Trade-offs

### Why Skia for React Native annotation (not SVG)?

`@shopify/react-native-skia` provides 60fps drawing performance with GPU acceleration. SVG-based drawing (e.g. `react-native-svg`) works but suffers from performance issues with many paths. Skia is the same engine used by Chrome and Android for rendering, so it's battle-tested. Trade-off: Skia requires a development build (no Expo Go), but ShakeNbake already requires a dev build for shake detection.

### Why html2canvas for web (not native browser APIs)?

The Screen Capture API (`getDisplayMedia`) requires user permission via a system dialog and captures the entire screen (not just the tab). `html2canvas` captures just the page content, works without permission dialogs, and handles most CSS correctly. Trade-off: html2canvas can't capture cross-origin iframes or some CSS features like `backdrop-filter`. For most bug reporting use cases, this is acceptable.

### Why a hosted version?

Audio transcription requires server-side processing (Whisper API). Running this client-side would expose API keys and isn't viable on mobile. The hosted version also solves the "I don't want to manage Linear API keys in my client bundle" problem by proxying through the Cloud API. The $10/month pricing covers infrastructure costs while remaining 20x cheaper than Shake or Instabug.

### Why monorepo?

A monorepo (using Turborepo) ensures all packages stay in sync, share types, and can be tested together. Contributors can work on a single adapter without touching the rest. Releases are coordinated via changesets.

---

## Appendix A: Competitive Landscape

| Feature | ShakeNbake | Shake | Instabug | Sentry Feedback | DIY |
|---|---|---|---|---|---|
| Open source | ✅ MIT | ❌ | ❌ | ✅ (limited) | ✅ |
| Shake-to-report | ✅ | ✅ | ✅ | ❌ | Build it |
| Screenshot annotation | ✅ | ✅ | ✅ | ❌ | Build it |
| Audio annotations | ✅ | ❌ | ❌ | ❌ | Build it |
| Speech-to-text | ✅ (Cloud) | ❌ | ❌ | ❌ | Build it |
| Linear integration | ✅ | ✅ | ❌ | ❌ | Build it |
| Web + Mobile | ✅ | ✅ | Mobile only | Web only | Build it |
| Price (self-hosted) | Free | — | — | — | Free |
| Price (hosted) | $10/mo | $160–340/mo | $249+/mo | Included | — |
| Plugin architecture | ✅ | ❌ | ❌ | ❌ | — |

---

## Appendix B: Key Dependencies

### React Native (`@shakenbake/react-native`)
| Package | Purpose |
|---|---|
| `react-native-shake` | Shake gesture detection |
| `react-native-view-shot` | Screenshot capture |
| `@shopify/react-native-skia` | Drawing/annotation canvas |
| `expo-av` | Audio recording |
| `expo-device` | Device info |
| `expo-battery` | Battery info |
| `expo-network` | Network info |
| `expo-localization` | Locale/timezone |
| `expo-screen-orientation` | Screen orientation |
| `expo-constants` | App version/build info |
| `@react-native-community/netinfo` | Network connection details |

### Web (`@shakenbake/web`)
| Package | Purpose |
|---|---|
| `html2canvas` | Screenshot capture |
| Native Canvas API | Drawing/annotation |
| Native MediaRecorder API | Audio recording |
| Native Navigator API | Device/browser info |
| Native Performance API | Performance metrics |

### Linear (`@shakenbake/linear`)
| Package | Purpose |
|---|---|
| `graphql-request` or `fetch` | Linear GraphQL API calls |

### Cloud (`apps/cloud`)
| Package | Purpose |
|---|---|
| `next` | Framework |
| `@clerk/nextjs` | Auth + multi-tenancy |
| `prisma` or `drizzle-orm` | Database ORM |
| `openai` | Whisper transcription |
| `@vercel/blob` | File storage |
| `stripe` | Billing |
