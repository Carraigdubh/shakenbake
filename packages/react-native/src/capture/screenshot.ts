// ---------------------------------------------------------------------------
// @shakenbake/react-native — ViewShotCapture plugin
// Captures a screenshot of the app using react-native-view-shot.
// ---------------------------------------------------------------------------

import type { CapturePlugin, CaptureResult, Platform } from '@shakenbake/core';
import { ShakeNbakeError } from '@shakenbake/core';
import type { RefObject } from 'react';

/**
 * Minimal interface for the react-native-view-shot captureRef function.
 * Defined locally to avoid a hard dependency on the module's types.
 */
type CaptureRefFn = (
  viewRef: number | RefObject<unknown>,
  options?: {
    format?: 'png' | 'jpg' | 'webm';
    quality?: number;
    result?: 'base64' | 'tmpfile' | 'data-uri';
    width?: number;
    height?: number;
  },
) => Promise<string>;

/**
 * Minimal type for React Native's Dimensions API.
 */
interface DimensionValue {
  width: number;
  height: number;
  scale?: number;
  fontScale?: number;
}

/**
 * CapturePlugin that takes a screenshot using react-native-view-shot.
 *
 * The `react-native-view-shot` module is a **peer dependency** and is loaded
 * at runtime via dynamic import.  If it is not installed, `capture()` will
 * throw a `ShakeNbakeError` with code `UPLOAD_FAILED`.
 *
 * Usage:
 * ```ts
 * const capture = new ViewShotCapture();
 * // Later, from your React component:
 * capture.setRef(myViewRef);
 * const result = await capture.capture();
 * ```
 */
export class ViewShotCapture implements CapturePlugin {
  readonly name = 'viewshot';
  readonly platform: Platform = 'react-native';

  private viewRef: RefObject<unknown> | null;

  constructor(viewRef?: RefObject<unknown>) {
    this.viewRef = viewRef ?? null;
  }

  /**
   * Set or update the React ref pointing to the capturable view.
   * This is typically called by a provider component once the root
   * view has mounted.
   */
  setRef(ref: RefObject<unknown>): void {
    this.viewRef = ref;
  }

  async capture(): Promise<CaptureResult> {
    // --- resolve captureRef function ---
    let captureRef: CaptureRefFn;
    try {
      const mod: Record<string, unknown> = await import(
        'react-native-view-shot'
      );
      captureRef = (mod['captureRef'] ?? mod['default']) as CaptureRefFn;
      if (typeof captureRef !== 'function') {
        throw new Error('captureRef is not a function');
      }
    } catch (err) {
      throw new ShakeNbakeError(
        '[ViewShotCapture] react-native-view-shot is required but not installed. ' +
          'Install it with: npx expo install react-native-view-shot',
        'UPLOAD_FAILED',
        { originalError: err },
      );
    }

    // --- resolve dimensions ---
    let dimensions: DimensionValue = { width: 0, height: 0 };
    try {
      const rn = await import('react-native');
      const Dimensions = (rn as Record<string, unknown>)['Dimensions'] as
        | { get(dim: string): DimensionValue }
        | undefined;
      if (Dimensions) {
        dimensions = Dimensions.get('window');
      }
    } catch {
      // react-native not available in test; dimensions stay at 0x0
    }

    // --- capture ---
    if (!this.viewRef) {
      throw new ShakeNbakeError(
        '[ViewShotCapture] No view ref set. Call setRef() with a ref to the root view before capturing.',
        'UPLOAD_FAILED',
      );
    }

    try {
      const base64 = await captureRef(this.viewRef, {
        format: 'png',
        quality: 1,
        result: 'base64',
      });

      return {
        imageData: base64,
        dimensions: {
          width: dimensions.width,
          height: dimensions.height,
        },
        mimeType: 'image/png',
      };
    } catch (err) {
      throw new ShakeNbakeError(
        '[ViewShotCapture] Screenshot capture failed.',
        'UPLOAD_FAILED',
        { originalError: err },
      );
    }
  }
}
