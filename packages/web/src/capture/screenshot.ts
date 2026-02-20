// ---------------------------------------------------------------------------
// @shakenbake/web — Html2CanvasCapture plugin
// Captures a screenshot of the current page using html2canvas-pro.
// ---------------------------------------------------------------------------

import html2canvas from 'html2canvas-pro';
import { ShakeNbakeError } from '@shakenbake/core';
import type { CapturePlugin, CaptureResult } from '@shakenbake/core';

/** Options for configuring the screenshot capture. */
export interface Html2CanvasCaptureOptions {
  /**
   * The DOM element to capture. Defaults to `document.body` when omitted.
   */
  target?: HTMLElement;
  /**
   * Device-pixel-ratio scale factor. Defaults to `window.devicePixelRatio`.
   */
  scale?: number;
}

/**
 * Screenshot capture plugin backed by `html2canvas-pro`.
 *
 * Captures the visible page (or a specific element) as a PNG base64 string.
 */
export class Html2CanvasCapture implements CapturePlugin {
  readonly name = 'html2canvas';
  readonly platform = 'web' as const;

  private readonly options: Html2CanvasCaptureOptions;

  constructor(options?: Html2CanvasCaptureOptions) {
    this.options = options ?? {};
  }

  async capture(): Promise<CaptureResult> {
    try {
      const target = this.options.target ?? document.body;
      const scale = this.options.scale ?? window.devicePixelRatio;

      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        logging: false,
      });

      const imageData = canvas.toDataURL('image/png');
      const dimensions = { width: canvas.width, height: canvas.height };

      return {
        imageData,
        dimensions,
        mimeType: 'image/png',
      };
    } catch (error: unknown) {
      throw new ShakeNbakeError(
        'Failed to capture screenshot with html2canvas',
        'UNKNOWN',
        { originalError: error },
      );
    }
  }
}
