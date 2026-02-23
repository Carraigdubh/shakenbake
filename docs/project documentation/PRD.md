# ShakeNbake - Product Requirements Document

## Executive Summary

ShakeNbake is an open-source cross-platform bug reporting SDK that enables users to capture annotated screenshots and submit bug reports directly from their applications. Users can trigger the bug report flow by shaking their device (mobile) or pressing a keyboard shortcut (web), capture and annotate a screenshot, and submit it as a Linear issue with automatically collected device and application context.

## Vision

To make bug reporting frictionless for end users while providing developers with rich context and annotated screenshots to fix issues faster.

## Key Features

### Core Functionality
1. **Multi-platform trigger mechanisms**
   - Mobile: Device shake detection (React Native)
   - Web: Keyboard shortcut (Ctrl+Shift+K)
   - Web: Floating Action Button (FAB)
   - Programmatic: JavaScript API

2. **Screenshot capture and annotation**
   - Device screenshot capture
   - Skia-powered GPU-accelerated annotation overlay (mobile)
   - Canvas-based annotation (web)
   - Drawing tools: pen, arrows, circles, rectangles, eraser
   - Undo/redo support

3. **Audio recording (planned)**
   - Optional voice memo recording
   - Audio transcription (Cloud version)

4. **Automatic context collection**
   - Platform and OS information
   - Screen resolution and orientation
   - Network status and connection type
   - Battery level and charging state
   - Locale and timezone
   - Performance metrics
   - Console logs (web only)
   - Application URL/route information

5. **Destination flexibility**
   - Linear issue creation
   - GitHub Issues (planned)
   - Jira (planned)
   - Custom adapters

6. **Privacy controls**
   - Configurable field redaction
   - Sensitive data filtering
   - No server-side storage of screenshots (self-hosted mode)

## Target Users

### Primary Users
- **End Users**: Users of applications integrated with ShakeNbake
- **Developers**: Developers integrating ShakeNbake into their apps
- **QA Teams**: Quality assurance professionals using ShakeNbake for testing

### Supported Platforms
- **Web**: React applications (Next.js recommended)
- **Mobile**: React Native with Expo (development builds required)

## Use Cases

1. **In-App Bug Reporting**: Users encounter a bug, shake device or press Ctrl+Shift+K, annotate the issue, and submit instantly
2. **QA Testing**: QA teams use ShakeNbake to document test failures with visual evidence
3. **User Research**: Collect annotated feedback from beta testers
4. **Feature Requests**: Users submit enhancement ideas with context-rich annotations

## Technical Architecture

### Monorepo Structure
```
packages/
  core/              # Platform-agnostic types, plugin interfaces, report builder
  linear/            # Linear GraphQL adapter
  web/               # Web SDK (React)
  react-native/      # React Native SDK (Expo)
  cloud-client/      # Client SDK for hosted version
apps/
  cloud/             # ShakeNbake Cloud — Next.js
examples/
  nextjs-app/        # Web example
  expo-app/          # Mobile example
```

### Plugin System

ShakeNbake is built on 4 plugin interfaces for extensibility:

1. **TriggerPlugin**: Initiates the report flow
   - Built-in: ShakeTrigger, KeyboardTrigger, FABTrigger
   - Custom: Any implementation can trigger the flow

2. **CapturePlugin**: Takes the screenshot
   - Built-in: ViewShotCapture (React Native), html2canvas (Web)
   - Custom: Implement for alternative capture methods

3. **ContextCollector**: Gathers device and app data
   - Built-in: DeviceContextCollector, BrowserCollector
   - Custom: Collect domain-specific metadata

4. **DestinationAdapter**: Sends the report
   - Built-in: LinearAdapter, ProxyAdapter, MockAdapter
   - Custom: GitHub Issues, Jira, Slack, internal systems, etc.

### Data Flow

```
Trigger (shake / Ctrl+Shift+K / FAB)
  ↓
Screenshot captured
  ↓
Annotation overlay (Skia/Canvas)
  ↓
Report form (title, description, severity)
  ↓
Device context auto-collected
  ↓
Screenshot + annotations + context uploaded
  ↓
Issue created in destination (Linear, GitHub, etc.)
```

## Security Model

### Web Applications
- **Server-side proxy pattern**: API keys stored on server, never exposed to client
- Requests proxied through Next.js API route or equivalent
- Client sends report to `/api/shakenbake` endpoint

### Mobile Applications
- **Environment variables**: API key in `.env`, compiled into binary
- Lower risk than browser (binary more resistant to reverse engineering)
- API key never transmitted to client-side code

### Cloud Version
- **Scoped write-only keys**: `snb_app_xxxxx` format
- Linear API keys stored server-side only
- Per-workspace isolation via Clerk multi-tenancy

### General Security
- **Typed error handling**: `ShakeNbakeError` with specific codes
  - `AUTH_FAILED`: Invalid credentials
  - `RATE_LIMITED`: Rate limit exceeded
  - `UPLOAD_FAILED`: File upload error
  - `NETWORK_ERROR`: Network failure
- **Prototype pollution protection**: Deep merge guards `__proto__`, `constructor`, `prototype`
- **Failed submission queuing**: Retry logic with local persistence

## Configuration

### Required Environment Variables

**Web (Next.js server-side)**
```
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
LINEAR_TEAM_ID=your-team-uuid
```

**React Native (Expo)**
```
EXPO_PUBLIC_LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
EXPO_PUBLIC_LINEAR_TEAM_ID=your-team-uuid
```

### Runtime Configuration

```typescript
interface ShakeNbakeConfig {
  enabled: boolean;
  destination: DestinationAdapter;
  ui?: {
    theme: 'light' | 'dark' | 'auto';
    accentColor?: string;
    showFAB?: boolean;
    position?: 'bottom-right' | 'bottom-left';
  };
  privacy?: {
    redactFields?: string[];  // e.g., ['app.url', 'console']
  };
  customMetadata?: () => Record<string, unknown>;
  triggers?: TriggerPlugin[];
  contextCollectors?: ContextCollector[];
}
```

## Deployment Targets

### Web (npm packages)
- Published to npm as `@shakenbake/*` scoped packages
- Deployed as part of React/Next.js applications
- No centralized web deployment (client integrates)

### Mobile (Expo)
- Requires Expo development builds (native modules)
- Not supported in Expo Go
- Built via `npx expo run:ios` or `npx expo run:android`

### Cloud Version (SaaS)
- **Frontend**: Next.js (App Router)
- **Hosting**: Vercel
- **Auth**: Clerk (authentication + multi-tenancy)
- **Database**: PostgreSQL (Neon/Supabase) with Prisma or Drizzle
- **File Storage**: Vercel Blob
- **Audio Processing**: OpenAI Whisper
- **Billing**: Stripe ($10/mo per workspace)

## Success Metrics

1. **Adoption**: Number of applications using ShakeNbake
2. **User Engagement**: Percentage of users submitting bug reports
3. **Report Quality**: Completeness of submitted reports with context and annotations
4. **Issue Resolution Time**: Average time to fix issues reported via ShakeNbake
5. **Zero-friction UX**: <5 seconds from trigger to submission

## Constraints and Limitations

### Web
- **html2canvas limitations**: Cannot capture cross-origin iframes or `backdrop-filter` CSS
- Screenshots are client-side only (limited cross-origin support)

### Mobile
- **Requires development builds**: No Expo Go support (native modules needed)
- **Skia for annotation**: Requires `@shopify/react-native-skia` (60fps GPU-accelerated drawing)
- **react-native-shake autolinking**: May require manual config in monorepo setups

### General
- **Linear as primary destination** (in MVP)
- **No offline queueing** in first release
- **Single active report** per session (cannot have multiple concurrent flows)

## Roadmap Phases

### Phase 1: MVP (Complete)
- ✅ Core types and plugin interfaces
- ✅ Linear adapter implementation
- ✅ Web SDK with html2canvas and Canvas annotation
- ✅ React Native SDK with Skia annotation
- ✅ Mock adapter for testing
- ✅ Example apps (Next.js and Expo)

### Phase 2: Enhancements (In Progress)
- ✅ Async trigger activation for better error handling
- ✅ Android GL surface screenshot fix
- ⏳ Audio recording and transcription
- ⏳ GitHub Issues and Jira adapters
- ⏳ Offline queueing and retry logic

### Phase 3: Cloud (Planned)
- ⏳ ShakeNbake Cloud SaaS
- ⏳ Multi-workspace management
- ⏳ Usage analytics and billing
- ⏳ OAuth for user authentication

## Dependencies

### Core Dependencies
- **React**: UI framework
- **TypeScript**: Type safety
- **Turborepo**: Monorepo management

### Web
- **html2canvas**: Screenshot capture
- **Canvas API**: Annotation drawing

### Mobile
- **react-native-shake**: Device shake detection
- **react-native-view-shot**: Screenshot capture
- **@shopify/react-native-skia**: GPU-accelerated annotation
- **expo-av**: Audio recording

### Destination Adapters
- **Linear GraphQL API**: Issue creation
- **Custom HTTP endpoints**: For custom adapters

## Success Criteria

1. **Type Safety**: All code written in TypeScript with strict mode
2. **Test Coverage**: Minimum 80% coverage on plugin system
3. **Documentation**: Complete API docs and example apps
4. **Performance**: <500ms from trigger to screenshot
5. **Accessibility**: WCAG 2.1 AA compliance for web UI
6. **Error Handling**: Typed errors with recovery mechanisms
