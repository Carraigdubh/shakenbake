# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShakeNbake is an open-source (MIT) cross-platform bug reporting SDK. Users shake their device or press a keyboard shortcut to capture a screenshot, annotate it, optionally record audio, and submit a bug report as a Linear issue. The project also includes a hosted SaaS version (ShakeNbake Cloud).

Full specification: `docs/ShakeNbake-PRD.md`
Quick reference: `docs/ShakeNbake-SUMMARY.md`

## Repository Status

This repository is in the **pre-code/specification phase**. No packages or code have been implemented yet. The PRD defines the full architecture, interfaces, and build order.

## Intended Architecture

### Monorepo (Turborepo)

```
packages/
  core/              # Platform-agnostic types, plugin interfaces, report builder
  react-native/      # Expo SDK (shake trigger, view-shot, Skia annotation, expo-av audio)
  web/               # Web SDK (keyboard/FAB trigger, html2canvas, Canvas annotation, MediaRecorder audio)
  linear/            # Linear GraphQL adapter (issueCreate + fileUpload)
  cloud-client/      # Client SDK for hosted version
apps/
  cloud/             # ShakeNbake Cloud — Next.js on Vercel (Clerk, Postgres, Whisper, Stripe)
examples/
  expo-app/          # Example Expo app
  nextjs-app/        # Example Next.js app
```

### Plugin System (4 interfaces in `@shakenbake/core`)

- **TriggerPlugin** — initiates the report flow (shake, keyboard shortcut, FAB, programmatic)
- **CapturePlugin** — takes the screenshot (react-native-view-shot, html2canvas)
- **ContextCollector** — gathers device/app data (battery, network, locale, console logs, etc.)
- **DestinationAdapter** — sends the report (Linear, GitHub Issues, Jira, Cloud)

### Data Flow

Trigger -> Screenshot capture -> Annotation overlay (Skia/Canvas) -> Optional audio recording -> Report form (pre-filled with auto-collected context) -> Upload screenshot + create issue in destination

## MVP Build Order

Build in this sequence (each step depends on the previous):

1. `@shakenbake/core` — types, plugin interfaces, report builder
2. `@shakenbake/linear` — Linear adapter (enables end-to-end testing)
3. `@shakenbake/web` — web SDK (faster iteration cycle than mobile)
4. `@shakenbake/react-native` — mobile SDK (can parallel with step 3 once core+linear exist)
5. Example apps (Expo + Next.js) and docs
6. `MockAdapter` for testing without Linear

## Key Technical Decisions

- **Skia** (`@shopify/react-native-skia`) for React Native annotation — 60fps GPU-accelerated drawing; requires Expo development build (not Expo Go)
- **html2canvas** for web screenshots — no permission dialog, captures page content only (cannot capture cross-origin iframes or `backdrop-filter`)
- **Expo SDK 52+** with development builds required (native modules: `react-native-shake`, Skia)
- **Server-side proxy pattern** recommended for web to keep Linear API keys off the client
- **Turborepo** for monorepo management with coordinated releases via changesets

## Cloud Tech Stack (apps/cloud)

Next.js (App Router), Vercel, Clerk (auth + multi-tenancy), Postgres via Neon/Supabase with Prisma or Drizzle, Vercel Blob for file storage, OpenAI Whisper for audio transcription, Stripe for billing ($10/mo per workspace).

## Security Model

- Web: server-side proxy keeps Linear API key off the client bundle
- React Native: API key in env var (compiled into binary, lower risk than browser)
- Cloud: scoped write-only API key per app (`snb_app_xxxxx`), Linear key stored server-side only
- Failed submissions queue locally (AsyncStorage / localStorage) and retry on reconnect
- Adapters throw typed `ShakeNbakeError` with codes: `AUTH_FAILED`, `RATE_LIMITED`, `UPLOAD_FAILED`, `NETWORK_ERROR`
- `.env.local` contains real API keys — never commit this file; add to `.gitignore`

## Key Interfaces

The `DestinationAdapter` interface is central to the plugin system:

```typescript
interface DestinationAdapter {
  name: string;
  uploadImage(imageData: Buffer | Blob, filename: string): Promise<string>;
  createIssue(report: BugReport): Promise<{ url: string; id: string }>;
  testConnection(): Promise<boolean>;
}
```

The `ShakeNbakeConfig` is the main configuration surface — see PRD Section 4 for full type definition.

## WhyCode (MANDATORY)

Before running `/whycode`, you MUST read ALL of these files:
- `/Users/martinquinlan/.claude/plugins/cache/whycode-marketplace/whycode/3.0.5/skills/whycode/SKILL.md`
- `/Users/martinquinlan/.claude/plugins/cache/whycode-marketplace/whycode/3.0.5/skills/whycode/reference/AGENTS.md`
- `/Users/martinquinlan/.claude/plugins/cache/whycode-marketplace/whycode/3.0.5/skills/whycode/reference/TEMPLATES.md`

Then verify:
- `docs/whycode/audit/startup-gate.json` has `status: pass`
- `docs/whycode/audit/startup-audit.json` has `status: pass`

If any file is missing or any gate fails, STOP and report startup incomplete.
