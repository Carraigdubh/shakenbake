# @shakenbake/react-native

React Native SDK for ShakeNbake bug reporting. Users shake their device to capture a screenshot, annotate it with Skia-powered drawing tools, optionally record audio, and submit a bug report.

## Installation

```bash
# yarn
yarn add @shakenbake/react-native

# npm
npm install @shakenbake/react-native
```

### Peer Dependencies

The following peer dependencies must be installed in your project:

```bash
npx expo install react-native-shake react-native-view-shot @shopify/react-native-skia
```

| Package | Purpose |
|---------|---------|
| `react-native-shake` | Device shake detection trigger |
| `react-native-view-shot` | Screenshot capture |
| `@shopify/react-native-skia` | GPU-accelerated annotation overlay |
| `@shakenbake/core` | Shared types and plugin interfaces |

## Usage

Wrap your app with `ShakeNbakeProvider` and supply a destination adapter (e.g. `@shakenbake/linear`):

```tsx
import { ShakeNbakeProvider } from '@shakenbake/react-native';
import { LinearAdapter } from '@shakenbake/linear';

const linear = new LinearAdapter({
  apiKey: process.env.LINEAR_API_KEY!,
  teamId: 'YOUR_TEAM_ID',
});

export default function App() {
  return (
    <ShakeNbakeProvider destination={linear}>
      {/* your app content */}
    </ShakeNbakeProvider>
  );
}
```

When the user shakes the device, the SDK captures a screenshot, opens an annotation overlay, and presents a report form pre-filled with device and app context.

## Troubleshooting

### react-native-shake autolinking in Expo monorepos

In monorepo setups, `react-native-shake` strict package exports may prevent the React Native autolinking discovery from resolving the module. If you see autolinking errors during `npx expo prebuild`, create a `react-native.config.js` in your app root:

```js
const path = require('path');

module.exports = {
  dependencies: {
    'react-native-shake': {
      root: path.resolve(__dirname, '../../node_modules/react-native-shake'),
    },
  },
};
```

After adding or updating native dependencies, rebuild with:

```bash
npx expo prebuild --clean
```

> **Note:** `react-native-shake` requires native modules and is not supported in Expo Go. You must use an Expo development build (`npx expo run:ios` or `npx expo run:android`).

### Android GL/Skia screenshot capture

On Android, `react-native-view-shot` may produce blank or incomplete screenshots when GL-rendered surfaces (Skia, MapView, camera previews) are present. The SDK automatically enables `handleGLSurfaceViewOnAndroid` on Android to ensure these surfaces are captured correctly. No manual configuration is needed.
