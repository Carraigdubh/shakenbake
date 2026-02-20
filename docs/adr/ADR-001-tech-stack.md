# ADR-001: Tech Stack

## Status
Accepted

## Date
2026-02-20

## Context
ShakeNbake is a cross-platform bug reporting SDK with a Turborepo monorepo. We need to select a consistent tech stack across packages and the cloud app.

## Decision

### Monorepo & Build
- **Turborepo v2** with Yarn workspaces
- **TypeScript** across all packages
- **changesets** for coordinated versioning

### Mobile SDK
- **Expo SDK 54** (React Native 0.81, React 19.1)
- **@shopify/react-native-skia v2.x** for annotation (GPU-accelerated)
- **react-native-view-shot** for screenshot capture
- **react-native-shake** for shake detection
- **expo-audio** for audio recording (stable in SDK 53+)
- Development builds required (no Expo Go)

### Web SDK
- **html2canvas-pro** for screenshot capture (oklch color support)
- **Canvas API** for annotation overlay
- **MediaRecorder API** for audio recording

### Cloud App (apps/cloud)
- **Next.js 14+** (App Router)
- **Clerk** for auth + multi-tenancy (Organizations)
- **Drizzle ORM** + **Neon** serverless Postgres
- **Vercel Blob** for file storage
- **OpenAI Whisper** for audio transcription
- **Stripe** for billing ($10/mo per workspace)
- Deployed on **Vercel**

### Integrations
- **Linear GraphQL API** as primary destination adapter
- Server-side proxy pattern for API key security on web

## Consequences

### Positive
- Drizzle: faster cold starts, no binary, native Neon driver
- Expo SDK 54: latest stable, New Architecture default
- html2canvas-pro: modern CSS color support
- Turborepo v2: fast builds with task caching

### Negative
- Yarn instead of pnpm (user preference; slightly larger node_modules)
- Expo dev builds required (no Expo Go testing)
- html2canvas cannot capture cross-origin iframes
