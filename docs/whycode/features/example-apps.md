# Feature: Example Apps

## Status: Planning

## Overview

Two example applications demonstrate the ShakeNbake SDK in action: an Expo development build app for React Native and a Next.js app for web. Both are minimal but fully functional demos that serve as integration tests, onboarding references, and living documentation for developers adopting the SDK.

Each example app shows the complete flow: trigger -> screenshot capture -> annotation -> report form -> submission to Linear (or MockAdapter for local development).

## User Story

As a developer evaluating ShakeNbake, I want to clone the repo, run an example app, and see the complete bug reporting flow in under 5 minutes so that I can understand what the SDK does and how to integrate it.

As a contributor, I want working example apps that I can use to verify my changes end-to-end across both platforms.

## Acceptance Criteria

### Expo App (`examples/expo-app`)

- [ ] Created with `create-expo-app` using Expo SDK 52+
- [ ] Configured for development builds (not Expo Go) via `expo prebuild`
- [ ] Installs `@shakenbake/react-native`, `@shakenbake/core`, and `@shakenbake/linear` from the local monorepo
- [ ] `App.tsx` wraps the app in `<ShakeNbakeProvider>` with:
  - `enabled: true` (always on for the demo)
  - `destination`: `LinearAdapter` (configured via `.env.local`) or `MockAdapter` as default
- [ ] Contains a simple multi-screen app (at least 2 screens with React Navigation) to demonstrate:
  - Shake-to-report trigger
  - Screenshot capture of different screens
  - Annotation overlay with drawing tools
  - Report form with pre-filled device context
  - Successful submission (to Linear or MockAdapter)
- [ ] Includes a "Report Bug" button in the UI as an alternative trigger (uses `useShakeNbake().trigger()`)
- [ ] `.env.local.example` file documents required environment variables:
  ```
  EXPO_PUBLIC_LINEAR_API_KEY=lin_api_xxxxx
  EXPO_PUBLIC_LINEAR_TEAM_ID=your-team-id
  ```
- [ ] `README.md` in the example directory with:
  - Prerequisites (Node.js, Expo CLI, Xcode/Android Studio)
  - Setup instructions (install, prebuild, configure env vars)
  - How to run on iOS simulator and Android emulator
  - How to test with MockAdapter (no Linear key needed)
- [ ] Falls back to `MockAdapter` if no Linear API key is configured
- [ ] Works on both iOS and Android

### Next.js App (`examples/nextjs-app`)

- [ ] Created with `create-next-app` using Next.js 14+ with App Router
- [ ] Installs `@shakenbake/web`, `@shakenbake/core`, and `@shakenbake/linear` from the local monorepo
- [ ] `app/layout.tsx` wraps the app in `<ShakeNbakeProvider>` with:
  - `enabled: true` (always on for the demo)
  - `destination`: `ProxyAdapter` pointing to `/api/shakenbake` (recommended pattern) or `MockAdapter` as default
  - `ui: { showFAB: true, position: 'bottom-right' }`
- [ ] Includes a server-side API proxy route (`app/api/shakenbake/route.ts`) that:
  - Creates a `LinearAdapter` with server-side environment variables
  - Proxies report submissions to Linear
  - Demonstrates the recommended security pattern
- [ ] Contains a simple multi-page app (at least 2 pages) to demonstrate:
  - Keyboard shortcut trigger (Cmd+Shift+K / Ctrl+Shift+K)
  - FAB button trigger
  - Programmatic trigger via a custom button
  - Screenshot capture of different pages
  - Annotation overlay with drawing tools
  - Report form with pre-filled browser context
  - Successful submission (to Linear or MockAdapter)
- [ ] `.env.local.example` file documents required environment variables:
  ```
  NEXT_PUBLIC_SHAKENBAKE=true
  LINEAR_API_KEY=lin_api_xxxxx
  LINEAR_TEAM_ID=your-team-id
  ```
- [ ] `README.md` in the example directory with:
  - Prerequisites (Node.js)
  - Setup instructions (install, configure env vars)
  - How to run (`npm run dev`)
  - How to test with MockAdapter (no Linear key needed)
- [ ] Falls back to `MockAdapter` if no Linear API key is configured

### Shared Requirements

- [ ] Both apps use workspace dependencies (not published npm versions) via Turborepo
- [ ] Both apps include a visible indicator showing ShakeNbake is active (FAB or debug banner)
- [ ] Both apps demonstrate the complete flow end-to-end
- [ ] Neither app commits `.env.local` (both have `.gitignore` entries)
- [ ] Both apps have clear, concise README files with copy-paste setup instructions

## Technical Approach

### Directory Structure

```
examples/
  expo-app/
    App.tsx                    # Root with ShakeNbakeProvider
    app/                       # Expo Router screens (or React Navigation)
      index.tsx                # Home screen
      details.tsx              # Detail screen (to show multi-screen capture)
    .env.local.example         # Template for environment variables
    app.json                   # Expo config
    package.json
    README.md
  nextjs-app/
    app/
      layout.tsx               # Root layout with ShakeNbakeProvider
      page.tsx                 # Home page
      about/
        page.tsx               # About page (to show multi-page capture)
      api/
        shakenbake/
          route.ts             # Server-side proxy for Linear
    .env.local.example         # Template for environment variables
    next.config.js
    package.json
    README.md
```

### Key Design Decisions

- Both apps default to MockAdapter when no Linear API key is configured, so developers can try the flow immediately without any setup
- The Next.js example demonstrates the server-side proxy pattern (the recommended production approach)
- The Expo example uses the direct LinearAdapter pattern (acceptable for development builds)
- Apps are intentionally minimal -- just enough UI to demonstrate the SDK features without distracting from the integration pattern
- Both apps use the example's README as the primary onboarding documentation

## Dependencies

- Expo App: `@shakenbake/react-native`, `@shakenbake/core`, `@shakenbake/linear`, `expo` 52+, `react-native` 0.76+, all Expo modules required by the RN SDK
- Next.js App: `@shakenbake/web`, `@shakenbake/core`, `@shakenbake/linear`, `next` 14+, `react` 18+

## Tasks
