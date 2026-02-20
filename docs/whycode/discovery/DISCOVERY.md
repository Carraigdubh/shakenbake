# Discovery Report — ShakeNbake

## Date
2026-02-20

## Summary
Standard discovery run covering all major dependencies for the ShakeNbake cross-platform bug reporting SDK.

## Key Findings

### 1. Expo SDK Version
- **Current stable**: SDK 54 (RN 0.81, React 19.1)
- **Recommendation**: Target SDK 53+ minimum (expo-audio stable, New Architecture default)
- **Impact**: PRD said "SDK 52+" — should update to SDK 53+
- **Breaking**: expo-av audio deprecated in SDK 52, use expo-audio instead

### 2. @shopify/react-native-skia
- **Latest**: v2.4.21 (requires RN 0.79+/React 19)
- **For SDK 52**: Use v1.12.4
- **For SDK 53+**: Can use v2.x
- **API**: Canvas + Path + Image for annotation overlay, useTouchHandler for drawing
- **Gotcha**: makeImageFromView has Android bugs — use react-native-view-shot instead

### 3. react-native-view-shot
- **Latest**: v4.0.3
- **API**: captureRef(ref, options) → file URI, captureScreen(options) → file URI
- **Gotcha**: Broken in Expo Go SDK 52 — dev builds required

### 4. react-native-shake
- **Latest**: v6.8.3
- **API**: RNShake.addListener(() => {}) returns subscription with .remove()
- **Requires dev build**: Not available in Expo Go

### 5. Audio Recording
- **React Native**: Use expo-audio (stable SDK 53+), NOT deprecated expo-av
- **Web**: MediaRecorder API — audio/webm on Chrome/Firefox, audio/mp4 on Safari
- **Safari gotcha**: getUserMedia must be triggered by user gesture

### 6. html2canvas
- **Recommendation**: Use html2canvas-pro fork (oklch/lab/lch color support)
- **Limitations**: No cross-origin iframes, no backdrop-filter, partial CSS coverage
- **API**: html2canvas(element, options) → Canvas element

### 7. Linear GraphQL API
- **Endpoint**: https://api.linear.app/graphql
- **Auth**: Authorization header with API key (no "Bearer" prefix)
- **Issue creation**: issueCreate mutation (teamId + title required)
- **File upload**: Two-step: fileUpload mutation → PUT to signed URL (server-side only)
- **Rate limit**: 5000 requests/hour per user

### 8. Turborepo
- **Latest**: v2.8.10
- **Breaking**: v2 uses "tasks" key, not "pipeline"
- **Setup**: pnpm workspaces + turbo.json with task dependencies

### 9. ORM Recommendation
- **Drizzle ORM v0.45.1** recommended over Prisma for Vercel serverless
- **Why**: Smaller bundle, faster cold starts, native Neon HTTP driver support, no binary
- **Connection**: @neondatabase/serverless HTTP driver (stateless, no pool exhaustion)

### 10. Clerk
- **Latest**: @clerk/nextjs v6.38.0
- **Middleware**: clerkMiddleware() with createRouteMatcher
- **Multi-tenancy**: Organizations feature (one workspace = one org)
- **Webhooks**: Svix-based, svix package required

### 11. Vercel Blob
- **Server upload limit**: 4.5MB (serverless function body limit)
- **Client upload**: Up to 5TB via multipart
- **Recommendation**: Client uploads for audio, server uploads for screenshots

### 12. Changesets
- **Setup**: @changesets/cli, linked packages for coordinated releases
- **Integration**: turbo run build → changeset version → changeset publish

## PRD Deviation Recommendations
| PRD Assumption | Discovery Finding | Action |
|---|---|---|
| Expo SDK 52+ | SDK 53+ recommended | Update target |
| expo-av for audio | Deprecated; use expo-audio | Switch to expo-audio |
| Prisma or Drizzle | Drizzle recommended | Use Drizzle ORM |
| html2canvas | html2canvas-pro fork better | Use html2canvas-pro |
| Skia (unversioned) | v1.12.4 for SDK 52, v2.x for SDK 53+ | Pin version based on SDK target |
