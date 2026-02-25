// ---------------------------------------------------------------------------
// @shakenbake/react-native — ShakeTrigger plugin
// Listens for device shake events via react-native-shake.
// ---------------------------------------------------------------------------

import type { TriggerPlugin, Platform } from '@shakenbake/core';

/**
 * Subscription handle returned by RNShake.addListener.
 * Defined locally to avoid a hard dependency on react-native-shake types.
 */
interface ShakeSubscription {
  remove(): void;
}

/**
 * Minimal interface for the react-native-shake module.
 * We only rely on the `addListener` export.
 */
interface RNShakeModule {
  addListener(callback: () => void): ShakeSubscription;
}

interface RNModuleWithNativeShake {
  NativeModules?: {
    RNShake?: unknown;
  };
  TurboModuleRegistry?: {
    get?: (name: string) => unknown;
  };
}

/**
 * TriggerPlugin that fires when the user physically shakes the device.
 *
 * The underlying native module (`react-native-shake`) is a **peer dependency**
 * and is loaded at runtime via dynamic import.  If the module is not installed,
 * `activate()` will throw a descriptive error explaining how to add it.
 */
export class ShakeTrigger implements TriggerPlugin {
  readonly name = 'shake';
  readonly platform: Platform = 'react-native';

  private subscription: ShakeSubscription | null = null;

  async activate(onTrigger: () => void): Promise<void> {
    // Guard simulator/dev runtimes where the native module is unavailable.
    // In that case we skip shake activation instead of crashing.
    try {
      const rn = (await import('react-native')) as RNModuleWithNativeShake;
      const nativeShake =
        rn?.TurboModuleRegistry?.get?.('RNShake') ?? rn?.NativeModules?.RNShake;
      if (!nativeShake) {
        // eslint-disable-next-line no-console
        console.warn(
          '[ShakeTrigger] Native RNShake module not found; shake trigger disabled for this runtime',
        );
        this.subscription = null;
        return;
      }
    } catch {
      // Ignore: if react-native import shape differs, we'll attempt module import below.
    }

    let RNShake: RNShakeModule;

    try {
      // Dynamic import keeps this module from failing at compile time
      // when react-native-shake is not installed (it is a peer dep).
      const mod = await import('react-native-shake');
      RNShake = (mod.default ?? mod) as RNShakeModule;
    } catch {
      throw new Error(
        '[ShakeTrigger] react-native-shake is required but not installed. ' +
          'Install it with: npx expo install react-native-shake',
      );
    }

    try {
      this.subscription = RNShake.addListener(onTrigger);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NativeEventEmitter')) {
        // eslint-disable-next-line no-console
        console.warn(
          '[ShakeTrigger] NativeEventEmitter unavailable for RNShake; shake trigger disabled for this runtime',
        );
        this.subscription = null;
        return;
      }
      throw err;
    }
  }

  deactivate(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}
