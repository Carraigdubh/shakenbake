# ShakeNbake — Project Summary

## What It Is

ShakeNbake is an open-source (MIT), cross-platform bug reporting SDK. Users shake their phone or press a keyboard shortcut on web to capture a screenshot, draw annotations on it, optionally record an audio narration, and submit a bug report that creates an issue in Linear. Everything is pluggable — issue trackers, platforms, and context collectors can be swapped or extended by contributors.

## Why It Exists

Every existing shake-to-report SDK (Shake, Instabug) costs $160–340/month, is closed-source, and locks you into their ecosystem. There is no open-source alternative that covers both mobile and web with screenshot annotation and Linear integration. ShakeNbake fills that gap at $0 (self-hosted) or $10/month (hosted with audio transcription).

## Packages

```
@shakenbake/core             — Shared types, plugin interfaces, report builder
@shakenbake/react-native     — Expo SDK: shake trigger, screenshot, Skia annotation canvas
@shakenbake/web              — Web SDK: keyboard shortcut/FAB, html2canvas, canvas annotation
@shakenbake/linear           — Linear GraphQL adapter (issueCreate + fileUpload)
@shakenbake/cloud-client     — Client SDK for the hosted version
```

## Hosted Version (ShakeNbake Cloud)

A Next.js app on Vercel providing multi-tenant SaaS at $10/month per workspace. Adds: user/app management dashboard, server-side audio transcription via OpenAI Whisper, report viewer, and issue tracker forwarding. Tech stack: Next.js, Clerk, Postgres (Neon/Supabase), Vercel Blob, Stripe.

## Plugin System (4 interfaces)

- **TriggerPlugin** — what initiates the report (shake, keyboard shortcut, FAB, programmatic)
- **CapturePlugin** — how screenshots are taken (react-native-view-shot, html2canvas)
- **ContextCollector** — what device/app data is gathered (battery, network, locale, console logs, etc.)
- **DestinationAdapter** — where reports go (Linear, GitHub Issues, Jira, Cloud)

## Core Flow

1. Trigger (shake / Cmd+Shift+K / FAB button)
2. Screenshot captured
3. Annotation overlay (freehand, arrows, rectangles, text, eraser, undo/redo)
4. Optional audio recording (up to 60s)
5. Report form (title, description, severity, category + auto-collected device context)
6. Submit → annotated screenshot uploaded → issue created in Linear
7. If using Cloud: audio transcribed via Whisper, transcript appended to issue async

## Device Context Collected

React Native: OS, device model, screen dimensions, orientation, network type/connectivity, battery level/state, locale/timezone, app version/build, accessibility settings, navigation route history, console logs/errors, memory usage, app uptime.

Web: browser/OS (from UA), viewport size, pixel ratio, orientation, network effective type/RTT, battery (where supported), locale/timezone, current URL/pathname, accessibility preferences (reduced motion, color scheme, contrast), performance metrics (FCP, LCP, page load), console logs/errors, failed network requests.

## Key Dependencies

- React Native: `react-native-shake`, `react-native-view-shot`, `@shopify/react-native-skia`, `expo-av`, `expo-device`, `expo-battery`, `expo-network`, `expo-localization`
- Web: `html2canvas`, native Canvas/MediaRecorder/Navigator/Performance APIs
- Cloud: `next`, `@clerk/nextjs`, `prisma`/`drizzle-orm`, `openai` (Whisper), `@vercel/blob`, `stripe`

## Build Order (v0.1 MVP)

1. `@shakenbake/core` — types and plugin interfaces
2. `@shakenbake/linear` — Linear adapter (enables end-to-end testing)
3. `@shakenbake/web` — web SDK (faster iteration cycle)
4. `@shakenbake/react-native` — mobile SDK (can parallel with step 3)
5. Example apps + docs
6. `MockAdapter` for testing without Linear

## Roadmap

- **v0.1** — Core + Linear + Web + React Native + examples
- **v0.2** — Audio recording, ShakeNbake Cloud, Whisper transcription, dashboard, Stripe billing
- **v0.3** — Video recording, network request capture, state snapshots, GitHub Issues adapter, i18n
- **v1.0** — Test suite, perf benchmarks, GDPR spec, security audit, Jira adapter, docs site, CI/CD

## Security Model

- Web: server-side proxy pattern keeps Linear API key off the client
- React Native: API key in env var (compiled into binary, not exposed to browser)
- Cloud: scoped write-only API key per app, Linear key stored server-side
- Failed submissions queued locally and retried on reconnect
- Adapters throw typed `ShakeNbakeError` with codes: `AUTH_FAILED`, `RATE_LIMITED`, `UPLOAD_FAILED`, `NETWORK_ERROR`

## Key Technical Decisions

- **Skia** over SVG for React Native annotation (60fps GPU-accelerated drawing)
- **html2canvas** over Screen Capture API for web (no permission dialog, captures page only)
- **Turborepo** monorepo for coordinated releases via changesets
- **Expo development build** required (no Expo Go) due to native module dependencies

## Full PRD

See `ShakeNbake-PRD.md` for complete specification including all TypeScript interfaces, device context tables, Linear issue template, Cloud architecture, contributing guide, and competitive analysis.
