# Feature: Web SDK (@shakenbake/web)

## Status: Planning

## Overview

The web SDK provides a complete bug reporting experience for browser-based applications. It supports React 18+ and works with Next.js 14+, Vite, Create React App, or any React-based SPA. Users trigger a report via keyboard shortcut (Cmd+Shift+K / Ctrl+Shift+K), a floating action button (FAB), or programmatically. The SDK captures a screenshot using html2canvas-pro, presents an annotation overlay built with the HTML5 Canvas API, collects comprehensive browser context, and submits the report through a configured DestinationAdapter.

The web SDK also includes a `ProxyAdapter` for the recommended server-side proxy pattern that keeps Linear API keys off the client bundle.

Audio recording via the MediaRecorder API is scoped for v0.2 but the interface is defined in this version.

## User Story

As a web developer, I want to add a bug reporting flow to my app that lets users press a keyboard shortcut or click a button to capture and annotate a screenshot, fill in a report form with auto-collected browser context, and submit it as a Linear issue -- all in under 5 minutes of setup.

As a web developer deploying to production, I want to use a server-side proxy adapter so my Linear API key is never exposed in the client bundle.

## Acceptance Criteria

### Provider Pattern

- [ ] `ShakeNbakeProvider` React component wraps the app and provides context:
  ```typescript
  import { ShakeNbakeProvider } from '@shakenbake/web';

  <ShakeNbakeProvider config={shakeNbakeConfig}>
    {children}
  </ShakeNbakeProvider>
  ```
- [ ] Provider accepts a `ShakeNbakeConfig` object from `@shakenbake/core`
- [ ] Provider initializes and manages the lifecycle of all plugins (triggers, capture, context collectors)
- [ ] Provider renders the FAB (if `config.ui.showFAB` is true)
- [ ] Provider renders the annotation overlay and report modal when triggered
- [ ] Provider respects the `config.enabled` flag (does nothing when false)

### useShakeNbake Hook

- [ ] `useShakeNbake()` hook exposes:
  ```typescript
  const { trigger, isOpen, config } = useShakeNbake();
  ```
- [ ] `trigger()` programmatically starts the bug report flow
- [ ] `isOpen` indicates whether the report flow is currently active
- [ ] Can be used to build custom trigger UI

### Trigger: Keyboard Shortcut

- [ ] Default shortcut: `Cmd+Shift+K` (macOS) / `Ctrl+Shift+K` (Windows/Linux)
- [ ] Globally registered via `keydown` event listener
- [ ] Shortcut is configurable
- [ ] Listener is properly cleaned up on unmount
- [ ] Only fires when `config.enabled` is true
- [ ] Implements `TriggerPlugin` interface with `platform: 'web'`

### Trigger: Floating Action Button (FAB)

- [ ] Persistent button rendered in a corner of the viewport
- [ ] Default position: bottom-right, configurable via `config.ui.position`
- [ ] Shows the ShakeNbake icon
- [ ] Only visible when `config.enabled` is true and `config.ui.showFAB` is true
- [ ] Displays keyboard shortcut as a tooltip on hover
- [ ] Implements `TriggerPlugin` interface with `platform: 'web'`
- [ ] Uses fixed positioning with a high z-index to stay above page content
- [ ] Styled with sensible defaults but respects `config.ui.accentColor` and `config.ui.theme`

### Trigger: Programmatic

- [ ] `trigger()` function from `useShakeNbake()` starts the report flow
- [ ] Can be wired to any custom UI element:
  ```typescript
  const { trigger } = useShakeNbake();
  <button onClick={trigger}>Report Bug</button>
  ```

### Screenshot Capture

- [ ] Uses `html2canvas-pro` to capture the current viewport
- [ ] Handles scroll position and fixed elements
- [ ] Captures at device pixel ratio for crisp screenshots
- [ ] Falls back gracefully if capture fails (allows user to paste/upload a screenshot manually)
- [ ] Implements `CapturePlugin` interface with `platform: 'web'`
- [ ] Returns `CaptureResult` with base64 image data, dimensions, and MIME type
- [ ] Known limitations documented: cannot capture cross-origin iframes or `backdrop-filter`

### Annotation Overlay

- [ ] Full-screen overlay appears after screenshot is captured
- [ ] Screenshot is displayed as the background of an HTML5 Canvas
- [ ] Drawing tools available:
  - Freehand pen (multiple colors, adjustable stroke width)
  - Arrow tool (drag to draw directional arrows)
  - Rectangle highlight tool
  - Oval/circle highlight tool
  - Text label tool
  - Eraser
- [ ] Undo/redo support
- [ ] Color palette: Red (default), yellow, blue, green, white, black
- [ ] Responsive to both mouse and touch input
- [ ] "Next" button advances to the report form
- [ ] "Cancel" button discards and closes the overlay
- [ ] Exports the annotated canvas as a base64 image

### Report Form

- [ ] Modal/overlay appears after annotation step
- [ ] Fields:
  - Title (required text input)
  - Description (optional textarea, auto-filled from audio transcript if available in v0.2)
  - Severity picker: low / medium / high / critical (default: medium)
  - Category picker: bug / UI / crash / performance / other (default: bug)
  - Screenshot preview (thumbnail of annotated screenshot)
  - Auto-collected device context (read-only, collapsible section)
- [ ] Submit button sends the report via the configured `DestinationAdapter`
- [ ] Shows a loading state during submission
- [ ] On success: displays confirmation with a link to the created issue
- [ ] On failure: displays the appropriate error message based on `ShakeNbakeError.code`
- [ ] Cancel button discards the report

### Context Collection (Browser)

- [ ] Implements `ContextCollector` interface with `platform: 'web'`
- [ ] Collects all web-specific context fields:

  **Platform:**
  - `platform.userAgent` from `navigator.userAgent`
  - `platform.browser` parsed from UA or `navigator.userAgentData`
  - `platform.os` parsed from UA or `navigator.userAgentData`
  - `platform.engine` parsed from UA
  - `platform.isMobile` from `navigator.userAgentData?.mobile`

  **Screen:**
  - `screen.width` from `window.screen.width`
  - `screen.height` from `window.screen.height`
  - `screen.viewportWidth` from `window.innerWidth`
  - `screen.viewportHeight` from `window.innerHeight`
  - `screen.devicePixelRatio` from `window.devicePixelRatio`
  - `screen.orientation` from `screen.orientation.type`
  - `screen.colorDepth` from `screen.colorDepth`
  - `screen.touchSupport` from `navigator.maxTouchPoints`

  **Network:**
  - `network.online` from `navigator.onLine`
  - `network.effectiveType` from `navigator.connection?.effectiveType`
  - `network.downlink` from `navigator.connection?.downlink`
  - `network.rtt` from `navigator.connection?.rtt`
  - `network.saveData` from `navigator.connection?.saveData`

  **Battery** (where supported):
  - `battery.level` from `navigator.getBattery()`
  - `battery.charging` from `navigator.getBattery()`
  - `battery.chargingTime` from `navigator.getBattery()`
  - `battery.dischargingTime` from `navigator.getBattery()`

  **Locale:**
  - `locale.languages` from `navigator.languages`
  - `locale.timezone` from `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - `locale.timezoneOffset` from `new Date().getTimezoneOffset()`

  **App / Page:**
  - `app.url` from `window.location.href`
  - `app.pathname` from `window.location.pathname`
  - `app.referrer` from `document.referrer`
  - `app.title` from `document.title`

  **Accessibility:**
  - `accessibility.prefersReducedMotion` from `matchMedia('prefers-reduced-motion')`
  - `accessibility.prefersColorScheme` from `matchMedia('prefers-color-scheme')`
  - `accessibility.prefersContrast` from `matchMedia('prefers-contrast')`
  - `accessibility.forcedColors` from `matchMedia('forced-colors')`

  **Performance:**
  - `performance.pageLoadTime` from Performance API
  - `performance.domContentLoaded` from Performance API
  - `performance.firstContentfulPaint` from Performance API
  - `performance.largestContentfulPaint` from Performance API
  - `performance.memoryUsage` from `performance.memory` (Chrome only)

  **Console:**
  - `console.recentLogs` from console interceptor (last 50 entries)
  - `console.recentErrors` from console interceptor (last 20 entries)
  - `console.unhandledRejections` from `window.onunhandledrejection` (last 10)

  **Network Requests** (optional, opt-in):
  - `network.recentRequests` from Fetch/XHR interceptor (last 20)
  - `network.failedRequests` from Fetch/XHR interceptor (last 10)

### Console Interceptor

- [ ] Intercepts `console.log`, `console.warn`, `console.error` calls
- [ ] Stores recent entries in a ring buffer (configurable size, default 50 for logs, 20 for errors)
- [ ] Each entry includes: `level`, `message`, `timestamp`
- [ ] Also captures unhandled promise rejections via `window.onunhandledrejection`
- [ ] Interceptor is installed when the provider mounts and removed on unmount
- [ ] Original console methods are preserved and still function normally

### ProxyAdapter

- [ ] `ProxyAdapter` class in `@shakenbake/web/adapters`:
  ```typescript
  import { ProxyAdapter } from '@shakenbake/web/adapters';

  const adapter = new ProxyAdapter({
    endpoint: '/api/shakenbake',
  });
  ```
- [ ] Implements `DestinationAdapter` interface
- [ ] Sends report data to the configured endpoint via `POST` request
- [ ] Handles errors from the proxy endpoint and throws appropriate `ShakeNbakeError`
- [ ] `testConnection()` calls the proxy endpoint to verify connectivity

### Audio Recording (v0.2 -- interface only for v0.1)

- [ ] Audio recording interface is defined but not implemented in v0.1
- [ ] Uses `MediaRecorder` API when implemented
- [ ] Will support hold-to-record or toggle button UX
- [ ] Visual waveform feedback via Web Audio API `AnalyserNode`
- [ ] Output format: WebM (Opus codec)
- [ ] Requires user permission for microphone access via `navigator.mediaDevices.getUserMedia`
- [ ] Maximum duration configurable via `config.audio.maxDurationMs` (default 60000)

### Offline Queue

- [ ] Failed report submissions are stored in `localStorage`
- [ ] Reports are retried when the browser comes back online (`navigator.onLine` + `online` event)
- [ ] Queue is processed on next page load if reports are pending

### Theming

- [ ] Supports `light`, `dark`, and `auto` themes via `config.ui.theme`
- [ ] `auto` follows the system preference (`prefers-color-scheme`)
- [ ] `config.ui.accentColor` customizes the primary color of UI elements
- [ ] All UI components (FAB, annotation overlay, report form) respect the theme

## Technical Approach

### Package Structure

```
packages/web/
  src/
    ShakeNbakeProvider.tsx     # React context provider
    hooks/
      useShakeNbake.ts         # Public hook for trigger/state access
    triggers/
      keyboard.ts              # Keyboard shortcut trigger plugin
      fab.tsx                   # Floating action button trigger plugin
    capture/
      screenshot.ts            # html2canvas-pro wrapper, CapturePlugin impl
    annotate/
      DrawingCanvas.tsx        # HTML5 Canvas annotation overlay component
      tools.ts                 # Drawing tool implementations
    audio/
      AudioRecorder.tsx        # MediaRecorder API (v0.2 implementation)
      types.ts                 # Audio interfaces (defined in v0.1)
    ui/
      ReportModal.tsx          # Bug report form modal
      AnnotationScreen.tsx     # Screenshot + drawing + audio combined screen
      theme.ts                 # Theme system
    context/
      collectors.ts            # Browser context collector
      console-interceptor.ts   # Console log capture
    adapters/
      proxy.ts                 # ProxyAdapter for server-side proxy pattern
    index.ts                   # Public API exports
  package.json
  tsconfig.json
```

### Key Design Decisions

- html2canvas-pro is used instead of the original html2canvas for better CSS support and active maintenance
- Canvas API is used for annotation (no additional library dependency) -- performant for drawing operations
- Console interceptor wraps native methods and stores entries in a ring buffer to avoid memory leaks
- ProxyAdapter is included in this package (not in `@shakenbake/linear`) because it is a web-specific pattern
- The FAB and annotation overlay use CSS-in-JS or inline styles to avoid requiring a CSS build step
- All UI is rendered in a React Portal to avoid z-index conflicts with the host app

## Dependencies

- `@shakenbake/core` (peer dependency)
- `html2canvas-pro` (screenshot capture)
- `react` >= 18.0.0 (peer dependency)
- `react-dom` >= 18.0.0 (peer dependency)

## Tasks
