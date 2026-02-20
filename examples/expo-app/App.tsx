import React from 'react';
import { ShakeNbakeProvider } from '@shakenbake/react-native';
import { LinearAdapter } from '@shakenbake/linear';

// In a real app, these come from your Expo environment variables.
// See: https://docs.expo.dev/guides/environment-variables/
const adapter = new LinearAdapter({
  apiKey: process.env.EXPO_PUBLIC_LINEAR_API_KEY ?? '',
  teamId: process.env.EXPO_PUBLIC_LINEAR_TEAM_ID ?? '',
});

export default function App() {
  return (
    <ShakeNbakeProvider
      config={{
        enabled: true,
        destination: adapter,
        ui: { showFAB: true, theme: 'auto' },
      }}
    >
      <HomeScreen />
    </ShakeNbakeProvider>
  );
}

/**
 * Minimal home screen component.
 *
 * In a real app you would use React Navigation or Expo Router here.
 * We keep this intentionally simple to avoid pulling in extra native
 * dependencies that would require `expo prebuild` to resolve.
 */
function HomeScreen() {
  // Use a dynamic require so TypeScript does not error when react-native
  // is not actually installed (this is an example stub in the monorepo).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, StyleSheet } = require('react-native') as typeof import('react-native');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
      backgroundColor: '#ffffff',
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: '#666666',
      textAlign: 'center' as const,
      lineHeight: 24,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ShakeNbake Demo</Text>
      <Text style={styles.subtitle}>
        Shake your device to report a bug. A screenshot will be captured
        automatically, and you can annotate it before submitting.
      </Text>
    </View>
  );
}
