// ---------------------------------------------------------------------------
// @shakenbake/web — useShakeNbake hook
// Convenience hook for consuming the ShakeNbake context from any child
// component within a ShakeNbakeProvider.
// ---------------------------------------------------------------------------

'use client';

import { useContext } from 'react';
import type { ShakeNbakeConfig } from '@shakenbake/core';
import { ShakeNbakeContext } from '../ShakeNbakeProvider.js';
import type { FlowStep } from '../ShakeNbakeProvider.js';

export interface UseShakeNbakeReturn {
  /** Programmatically trigger the bug-report flow. */
  trigger: () => void;
  /** Whether the bug-report overlay is currently visible. */
  isOpen: boolean;
  /** Current step of the flow state machine. */
  currentStep: FlowStep;
  /** The active ShakeNbakeConfig. */
  config: ShakeNbakeConfig;
}

/**
 * Returns the ShakeNbake context value.
 *
 * Must be called inside a `<ShakeNbakeProvider>`. Throws if used outside the
 * provider tree.
 */
export function useShakeNbake(): UseShakeNbakeReturn {
  const ctx = useContext(ShakeNbakeContext);
  if (!ctx) {
    throw new Error(
      'useShakeNbake must be used within a <ShakeNbakeProvider>. ' +
        'Wrap your application with <ShakeNbakeProvider config={...}>.',
    );
  }
  return ctx;
}
