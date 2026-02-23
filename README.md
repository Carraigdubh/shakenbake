# ShakeNbake

Open-source cross-platform bug reporting SDK. Users shake their device or press a keyboard shortcut to capture a screenshot, annotate it, and submit a bug report as a Linear issue — with full device context attached automatically.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@shakenbake/core`](packages/core) | Types, plugin interfaces, report builder | [![npm](https://img.shields.io/npm/v/@shakenbake/core)](https://www.npmjs.com/package/@shakenbake/core) |
| [`@shakenbake/linear`](packages/linear) | Linear GraphQL adapter | [![npm](https://img.shields.io/npm/v/@shakenbake/linear)](https://www.npmjs.com/package/@shakenbake/linear) |
| [`@shakenbake/web`](packages/web) | Web SDK (React) | [![npm](https://img.shields.io/npm/v/@shakenbake/web)](https://www.npmjs.com/package/@shakenbake/web) |
| [`@shakenbake/react-native`](packages/react-native) | React Native SDK (Expo) | [![npm](https://img.shields.io/npm/v/@shakenbake/react-native)](https://www.npmjs.com/package/@shakenbake/react-native) |

## How It Works

```
Trigger (shake / Ctrl+Shift+K / FAB button)
  -> Screenshot captured
    -> Annotation overlay (pen, arrows, circles, rectangles, eraser)
      -> Report form (title, description, severity)
        -> Device context auto-collected
          -> Linear issue created with screenshot + context
```

## Quick Start (Web)

### Install

```bash
npm install @shakenbake/web @shakenbake/linear
```

### 1. Server-side proxy (keeps your Linear API key off the client)

```ts
// app/api/shakenbake/route.ts (Next.js App Router)
import { NextResponse } from 'next/server';
import { LinearAdapter } from '@shakenbake/linear';

const adapter = new LinearAdapter({
  apiKey: process.env.LINEAR_API_KEY!,
  teamId: 'your-linear-team-id',
});

export async function POST(req: Request) {
  const report = await req.json();
  const result = await adapter.createIssue(report);
  return NextResponse.json(result);
}
```

### 2. Wrap your app

```tsx
// app/providers.tsx
'use client';

import { ShakeNbakeProvider } from '@shakenbake/web';
import { ProxyAdapter } from '@shakenbake/web';

const adapter = new ProxyAdapter({ endpoint: '/api/shakenbake' });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ShakeNbakeProvider config={{ enabled: true, destination: adapter }}>
      {children}
    </ShakeNbakeProvider>
  );
}
```

### 3. Use it

Press **Ctrl+Shift+K** on any page to trigger a bug report.

## Quick Start (React Native / Expo)

### Install

```bash
npm install @shakenbake/react-native @shakenbake/linear
```

Requires Expo development build (not Expo Go) for native dependencies:

```bash
npx expo install react-native-shake react-native-view-shot @shopify/react-native-skia
```

> **Note:** `@shopify/react-native-skia` is an open-source 2D graphics library maintained by Shopify — it's not a Shopify product or service. ShakeNbake uses it for high-performance 60fps annotation drawing on mobile.

### Wrap your app

```tsx
// App.tsx
import { ShakeNbakeProvider } from '@shakenbake/react-native';
import { LinearAdapter } from '@shakenbake/linear';

const adapter = new LinearAdapter({
  apiKey: process.env.EXPO_PUBLIC_LINEAR_API_KEY!,
  teamId: 'your-linear-team-id',
});

export default function App() {
  return (
    <ShakeNbakeProvider config={{ enabled: true, destination: adapter }}>
      <YourApp />
    </ShakeNbakeProvider>
  );
}
```

Shake your device to trigger a bug report.

## Configuration

```tsx
<ShakeNbakeProvider
  config={{
    enabled: true,
    destination: adapter,
    ui: {
      theme: 'dark',              // 'light' | 'dark' | 'auto'
      accentColor: '#6366f1',
      showFAB: true,              // floating action button trigger
      position: 'bottom-right',
    },
    privacy: {
      redactFields: ['app.url', 'console'],  // strip sensitive context
    },
    customMetadata: () => ({
      userId: currentUser.id,
      appVersion: '2.1.0',
    }),
  }}
>
  {children}
</ShakeNbakeProvider>
```

## Programmatic Trigger

```tsx
import { useShakeNbake } from '@shakenbake/web'; // or @shakenbake/react-native

function ReportBugButton() {
  const { trigger } = useShakeNbake();
  return <button onClick={trigger}>Report Bug</button>;
}
```

## What Gets Collected

Every bug report automatically includes:

- **Screenshot** — annotated + original
- **Platform** — OS, browser, user agent
- **Screen** — resolution, pixel ratio, orientation
- **Network** — connection type, online status
- **Battery** — level, charging state
- **Locale** — language, timezone
- **Performance** — page load time, LCP, FCP, memory (web)
- **Console** — recent logs, errors, unhandled rejections (web)
- **App** — current URL/route, referrer, title

## Plugin Architecture

ShakeNbake is built on 4 plugin interfaces. Everything is swappable:

| Interface | Purpose | Built-in |
|-----------|---------|----------|
| `TriggerPlugin` | Starts the report flow | Keyboard, FAB, Shake |
| `CapturePlugin` | Takes the screenshot | html2canvas (web), ViewShot (RN) |
| `ContextCollector` | Gathers device data | BrowserCollector, DeviceCollector |
| `DestinationAdapter` | Sends the report | LinearAdapter, ProxyAdapter, MockAdapter |

### Custom Adapter Example

```ts
import type { DestinationAdapter, BugReport, SubmitResult } from '@shakenbake/core';

class SlackAdapter implements DestinationAdapter {
  name = 'slack';

  async uploadImage(imageData: Blob, filename: string): Promise<string> {
    // Upload to your file storage, return URL
  }

  async createIssue(report: BugReport): Promise<SubmitResult> {
    // Post to Slack webhook
  }

  async testConnection(): Promise<boolean> {
    // Verify webhook URL works
  }
}
```

## Testing Without Linear

Use `MockAdapter` for development and testing:

```tsx
import { MockAdapter } from '@shakenbake/core';

const adapter = new MockAdapter(); // logs to console, returns mock responses

<ShakeNbakeProvider config={{ enabled: true, destination: adapter }}>
  {children}
</ShakeNbakeProvider>
```

## Environment Variables

### Web (Next.js)

```bash
# .env.local
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx    # server-side only
LINEAR_TEAM_ID=your-team-uuid
```

### React Native (Expo)

```bash
# .env
EXPO_PUBLIC_LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
EXPO_PUBLIC_LINEAR_TEAM_ID=your-team-uuid
```

## Example Apps

- [`examples/nextjs-app`](examples/nextjs-app) — Next.js 15 with server-side proxy
- [`examples/expo-app`](examples/expo-app) — Expo SDK 54

## Development

```bash
# Install dependencies
yarn install

# Build all packages
npx turbo build

# Run all tests (398 tests)
npx turbo test

# Typecheck
npx turbo typecheck
```

### Monorepo Structure

```
packages/
  core/              # Platform-agnostic types, plugin interfaces, report builder
  linear/            # Linear GraphQL adapter
  web/               # Web SDK (React)
  react-native/      # React Native SDK (Expo)
  cloud-client/      # Client SDK for hosted version (planned)
apps/
  cloud/             # ShakeNbake Cloud (planned)
examples/
  nextjs-app/        # Next.js example
  expo-app/          # Expo example
```

## Security

- **Web**: Server-side proxy pattern keeps Linear API key off the client bundle
- **React Native**: API key in env var (compiled into binary, not exposed in browser)
- **Privacy**: `redactFields` config strips sensitive context before submission
- **Error handling**: Typed `ShakeNbakeError` with codes: `AUTH_FAILED`, `RATE_LIMITED`, `UPLOAD_FAILED`, `NETWORK_ERROR`
- **Prototype pollution protection**: Deep merge utility guards against `__proto__` injection

## License

MIT
