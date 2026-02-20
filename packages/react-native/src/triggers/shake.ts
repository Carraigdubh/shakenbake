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

    this.subscription = RNShake.addListener(onTrigger);
  }

  deactivate(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}
