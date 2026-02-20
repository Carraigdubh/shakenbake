# Feature: React Native SDK (@shakenbake/react-native)

## Status: Planning

## Overview

The React Native SDK provides a complete bug reporting experience for Expo and React Native applications. Users shake their device to trigger the flow, which captures a screenshot using react-native-view-shot, presents a GPU-accelerated annotation overlay built with @shopify/react-native-skia, collects comprehensive device context from Expo modules, and submits the report through a configured DestinationAdapter.

The SDK requires an Expo development build (not Expo Go) because react-native-shake and @shopify/react-native-skia require native modules. It supports Expo SDK 52+ and React Native 0.76+ with the New Architecture.

Audio recording via expo-audio is scoped for v0.2 but the interface is defined in this version.

## User Story

As a mobile developer using Expo, I want to add shake-to-report bug reporting to my app so that QA testers and beta users can capture annotated screenshots with full device context and submit them as Linear issues without leaving the app.

As a developer, I want the SDK to collect all available device, network, battery, locale, and app context automatically so that I have everything I need to reproduce bugs without asking follow-up questions.

## Acceptance Criteria

### Provider Pattern

- [ ] `ShakeNbakeProvider` React component wraps the app root:
  ```typescript
  import { ShakeNbakeProvider } from '@shakenbake/react-native';

  <ShakeNbakeProvider config={shakeNbakeConfig}>
    {children}
  </ShakeNbakeProvider>
  ```
- [ ] Provider accepts a `ShakeNbakeConfig` object from `@shakenbake/core`
- [ ] Provider wraps children in a capturable view (for react-native-view-shot)
- [ ] Provider initializes shake detection and other triggers
- [ ] Provider manages the report flow lifecycle (capture -> annotate -> form -> submit)
- [ ] Provider respects the `config.enabled` flag (does nothing when false)
- [ ] Typically gated with `enabled: __DEV__` for development-only usage

### useShakeNbake Hook

- [ ] `useShakeNbake()` hook exposes:
  ```typescript
  const { trigger, isOpen, config } = useShakeNbake();
  ```
- [ ] `trigger()` programmatically starts the bug report flow
- [ ] Useful for wiring to a debug menu button or custom UI

### Trigger: Shake Detection

- [ ] Uses `react-native-shake` to detect device shake gesture
- [ ] Configurable sensitivity threshold
- [ ] Only active when `config.enabled` is true
- [ ] Implements `TriggerPlugin` interface with `platform: 'react-native'`
- [ ] Properly cleaned up when provider unmounts
- [ ] Requires Expo development build (not Expo Go)

### Trigger: Programmatic

- [ ] `trigger()` from `useShakeNbake()` starts the report flow
- [ ] Can be connected to any custom UI (debug menu, button, gesture):
  ```typescript
  const { trigger } = useShakeNbake();
  <Button onPress={trigger} title="Report Bug" />
  ```

### Screenshot Capture

- [ ] Uses `react-native-view-shot` to capture the current screen
- [ ] Provider wraps app root in a `ViewShot` component (ref-based capture)
- [ ] Captures at device resolution (uses `PixelRatio` for scale)
- [ ] Returns base64-encoded image data
- [ ] Implements `CapturePlugin` interface with `platform: 'react-native'`
- [ ] Returns `CaptureResult` with image data, dimensions, and MIME type

### Annotation Canvas

- [ ] Full-screen overlay appears after screenshot is captured
- [ ] Built with `@shopify/react-native-skia` for 60fps GPU-accelerated drawing
- [ ] Screenshot displayed as a Skia `Image` background
- [ ] Drawing is performed on a Skia `Canvas` with `Path` elements
- [ ] Drawing tools available:
  - Freehand pen (multiple colors, adjustable stroke width)
  - Arrow tool (drag to draw directional arrows)
  - Rectangle highlight tool
  - Oval/circle highlight tool
  - Text label tool
  - Eraser
- [ ] Undo/redo support (maintains a path history stack)
- [ ] Color palette: Red (default), yellow, blue, green, white, black
- [ ] Touch input: uses Skia's `useTouchHandler` or gesture handler for drawing
- [ ] "Next" button advances to the report form
- [ ] "Cancel" button discards and closes the overlay
- [ ] Exports the annotated canvas as a base64 image via Skia's `makeImageSnapshot()`

### Report Form

- [ ] React Native `Modal` component appears after annotation step
- [ ] Fields:
  - Title (required `TextInput`)
  - Description (optional multiline `TextInput`, auto-filled from audio transcript if available in v0.2)
  - Severity picker: low / medium / high / critical (default: medium)
  - Category picker: bug / UI / crash / performance / other (default: bug)
  - Screenshot preview (thumbnail `Image` of annotated screenshot)
  - Auto-collected device context (read-only, collapsible `ScrollView` section)
- [ ] Submit button sends the report via the configured `DestinationAdapter`
- [ ] Shows an `ActivityIndicator` during submission
- [ ] On success: displays confirmation with issue URL (tappable to open in browser via `Linking`)
- [ ] On failure: displays the appropriate error message based on `ShakeNbakeError.code`
- [ ] Cancel button discards the report and closes the modal

### Context Collection (React Native)

- [ ] Implements `ContextCollector` interface with `platform: 'react-native'`
- [ ] Collects all React Native-specific context fields:

  **Platform:**
  - `platform.os` from `Platform.OS`
  - `platform.osVersion` from `Platform.Version`
  - `platform.sdkVersion` from `expo-constants`
  - `platform.runtimeVersion` from `expo-constants`
  - `platform.isEmulator` from `expo-device`

  **Device:**
  - `device.manufacturer` from `expo-device`
  - `device.model` from `expo-device`
  - `device.modelId` from `expo-device`
  - `device.deviceType` from `expo-device`
  - `device.totalMemory` from `expo-device`
  - `device.deviceName` from `expo-device`

  **Screen:**
  - `screen.width` from `Dimensions`
  - `screen.height` from `Dimensions`
  - `screen.scale` from `PixelRatio`
  - `screen.fontScale` from `PixelRatio`
  - `screen.orientation` from `expo-screen-orientation`

  **Network:**
  - `network.type` from `@react-native-community/netinfo`
  - `network.isConnected` from `@react-native-community/netinfo`
  - `network.isInternetReachable` from `@react-native-community/netinfo`
  - `network.cellularGeneration` from `@react-native-community/netinfo`
  - `network.ipAddress` from `expo-network`
  - `network.isAirplaneMode` from `expo-network`

  **Battery:**
  - `battery.level` from `expo-battery`
  - `battery.state` from `expo-battery`
  - `battery.lowPowerMode` from `expo-battery`

  **Locale:**
  - `locale.languageCode` from `expo-localization`
  - `locale.regionCode` from `expo-localization`
  - `locale.currencyCode` from `expo-localization`
  - `locale.timezone` from `expo-localization`
  - `locale.isRTL` from `expo-localization`
  - `locale.measurementSystem` from `expo-localization`
  - `locale.temperatureUnit` from `expo-localization`

  **App:**
  - `app.version` from `expo-constants`
  - `app.buildNumber` from `expo-constants`
  - `app.bundleId` from `expo-constants`
  - `app.installationId` from `expo-constants`
  - `app.updateId` from `expo-updates`

  **Accessibility:**
  - `accessibility.fontScale` from `PixelRatio.getFontScale()`
  - `accessibility.screenReaderEnabled` from `AccessibilityInfo`
  - `accessibility.reduceMotionEnabled` from `AccessibilityInfo`
  - `accessibility.boldTextEnabled` from `AccessibilityInfo` (iOS only)
  - `accessibility.invertColorsEnabled` from `AccessibilityInfo` (iOS only)

  **Performance:**
  - `performance.memoryUsage` from `react-native-device-info` or native module
  - `performance.appUptime` from custom timer (time since provider mount)
  - `performance.jsBundleLoadTime` from custom timer

  **Navigation:**
  - `navigation.currentRoute` from React Navigation state (if available)
  - `navigation.routeParams` from React Navigation state (if available)
  - `navigation.navigationHistory` from custom tracker (last 10 routes)

  **Console:**
  - `console.recentLogs` from console interceptor (last 50 entries)
  - `console.recentErrors` from console interceptor (last 20 entries)

### Console Interceptor

- [ ] Intercepts `console.log`, `console.warn`, `console.error` calls
- [ ] Stores recent entries in a ring buffer (configurable size, default 50 for logs, 20 for errors)
- [ ] Each entry includes: `level`, `message`, `timestamp`
- [ ] Interceptor is installed when the provider mounts and removed on unmount
- [ ] Original console methods are preserved and still function normally

### Audio Recording (v0.2 -- interface only for v0.1)

- [ ] Audio recording interface is defined but not implemented in v0.1
- [ ] Will use `expo-audio` (successor to expo-av) when implemented
- [ ] Will support hold-to-record or toggle button UX
- [ ] Visual waveform feedback during recording
- [ ] Output format: M4A (iOS) / WebM (Android)
- [ ] Requires microphone permission (prompted on first record)
- [ ] Maximum duration configurable via `config.audio.maxDurationMs` (default 60000)

### Offline Queue

- [ ] Failed report submissions are stored in `AsyncStorage`
- [ ] Reports are retried when connectivity is restored (detected via NetInfo)
- [ ] Queue is processed on next app launch if reports are pending

### Privacy / Redaction

- [ ] Supports `config.privacy.redactTestIDs` to auto-blur sensitive elements in screenshots
- [ ] Elements with matching `testID` values are blurred/obscured in the captured screenshot
- [ ] `config.privacy.stripPersonalData` removes IPs and device names from context

## Technical Approach

### Package Structure

```
packages/react-native/
  src/
    ShakeNbakeProvider.tsx     # React context provider with ViewShot wrapper
    hooks/
      useShakeNbake.ts         # Public hook for trigger/state access
    triggers/
      shake.ts                 # react-native-shake trigger plugin
    capture/
      screenshot.ts            # react-native-view-shot wrapper, CapturePlugin impl
    annotate/
      DrawingCanvas.tsx        # Skia-based annotation overlay component
      tools.ts                 # Drawing tool implementations (Skia paths)
    audio/
      AudioRecorder.tsx        # expo-audio recording (v0.2 implementation)
      types.ts                 # Audio interfaces (defined in v0.1)
    ui/
      ReportModal.tsx          # Bug report form modal
      AnnotationScreen.tsx     # Screenshot + drawing + audio combined screen
    context/
      collectors.ts            # RN device context collector
      console-interceptor.ts   # Console log capture
    index.ts                   # Public API exports
  package.json
  tsconfig.json
```

### Key Design Decisions

- Skia is chosen over SVG for annotation because it provides 60fps GPU-accelerated drawing; SVG-based solutions suffer performance issues with many paths
- Skia requires a development build, but ShakeNbake already requires one for react-native-shake, so there is no additional cost
- The provider wraps children in a `ViewShot` component to enable screenshot capture of the entire app
- Context collection uses individual Expo modules rather than a monolithic device info package for modularity and tree-shaking
- Navigation context is optional and works with React Navigation (the most common RN navigation library)
- The report modal uses React Native's built-in `Modal` component for reliable cross-platform behavior

### Platform Requirements

- Expo SDK 52+ with development builds (not Expo Go)
- React Native 0.76+
- React Native New Architecture supported
- iOS: Motion & Fitness permission for shake detection (automatic prompt)
- Android: No special permissions for v0.1 features

## Dependencies

- `@shakenbake/core` (peer dependency)
- `react-native-shake` (shake detection trigger)
- `react-native-view-shot` (screenshot capture)
- `@shopify/react-native-skia` (annotation canvas)
- `expo-device` (device info context)
- `expo-battery` (battery context)
- `expo-network` (network context)
- `expo-localization` (locale context)
- `expo-screen-orientation` (screen orientation context)
- `expo-constants` (app version/build context)
- `@react-native-community/netinfo` (network connection details)
- `react` >= 18.0.0 (peer dependency)
- `react-native` >= 0.76.0 (peer dependency)
- `expo` >= 52.0.0 (peer dependency)

## Tasks
