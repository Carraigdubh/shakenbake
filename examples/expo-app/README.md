# ShakeNbake Expo Example

Minimal Expo SDK 54 app demonstrating `@shakenbake/react-native` with direct Linear integration.

## Prerequisites

- Node.js 20+
- yarn 1.x (workspace-managed from monorepo root)
- Xcode 16+ (iOS) and/or Android Studio (Android)
- A Linear account with an API key
- This app requires a **development build** (not Expo Go) due to native modules (react-native-shake, Skia)

## Setup

1. Install dependencies from the **monorepo root** (not from this directory):

   ```bash
   cd ../..
   yarn install
   ```

2. Copy the environment file and fill in your Linear credentials:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   ```
   EXPO_PUBLIC_LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
   EXPO_PUBLIC_LINEAR_TEAM_ID=your-team-uuid
   ```

3. Build the SDK packages:

   ```bash
   # From monorepo root
   yarn build
   ```

4. Generate native projects:

   ```bash
   npx expo prebuild
   ```

5. Run on a device or simulator:

   ```bash
   # iOS
   npx expo run:ios

   # Android
   npx expo run:android
   ```

## How to Trigger a Bug Report

- **Shake your device** to initiate the bug report flow
- The floating bug button (FAB) is also enabled in the bottom-right corner

## What Happens

1. A screenshot of the current screen is captured via react-native-view-shot
2. An annotation overlay opens with Skia-powered drawing tools (pen, highlighter, arrow, text)
3. A report form appears pre-filled with device context (OS, model, battery, network, locale, etc.)
4. On submit, the report is sent directly to Linear as an issue with the annotated screenshot attached

## Architecture

- `App.tsx` — Root component wrapping the app in `ShakeNbakeProvider` with `LinearAdapter`
- `index.ts` — Entry point exporting the App component

## Security Note

The Linear API key is embedded in the app binary via `EXPO_PUBLIC_` environment variables. This is acceptable for mobile apps (the binary is not inspectable like a web bundle), but for higher security consider using a server-side proxy pattern similar to the Next.js example.
