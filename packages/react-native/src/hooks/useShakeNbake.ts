// ---------------------------------------------------------------------------
// @shakenbake/react-native — useShakeNbake hook
//
// Consumes the ShakeNbake React context provided by ShakeNbakeProvider.
// ---------------------------------------------------------------------------

import { useContext } from 'react';

import type { ShakeNbakeConfig } from '@shakenbake/core';

import { ShakeNbakeContext } from '../ShakeNbakeProvider.js';
import type { FlowStep } from '../ui/state-machine.js';

/**
 * Return type for the useShakeNbake hook.
 */
export interface UseShakeNbakeResult {
  /** Programmatically trigger the bug-reporting flow. */
  trigger: () => void;
  /** Whether the reporting flow is currently open (not idle). */
  isOpen: boolean;
  /** The current step in the reporting flow. */
  currentStep: FlowStep;
  /** The SDK configuration. */
  config: ShakeNbakeConfig;
}

/**
 * Hook to interact with the ShakeNbake bug-reporting flow.
 *
 * Must be used within a `<ShakeNbakeProvider>`.
 *
 * @example
 * ```tsx
 * const { trigger, isOpen } = useShakeNbake();
 * // trigger() opens the bug-reporting flow programmatically
 * ```
 */
export function useShakeNbake(): UseShakeNbakeResult {
  const ctx = useContext(ShakeNbakeContext);
  if (!ctx) {
    throw new Error(
      'useShakeNbake must be used within a <ShakeNbakeProvider>. ' +
        'Wrap your app with <ShakeNbakeProvider config={...}>.',
    );
  }
  return ctx;
}
