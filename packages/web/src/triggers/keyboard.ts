// ---------------------------------------------------------------------------
// @shakenbake/web — KeyboardTrigger plugin
// Activates the bug-report flow via Cmd+Shift+K (Mac) / Ctrl+Shift+K (other)
// ---------------------------------------------------------------------------

import type { TriggerPlugin } from '@shakenbake/core';

/**
 * Keyboard shortcut trigger for the web SDK.
 *
 * When activated, listens for `Cmd+Shift+K` (macOS) or `Ctrl+Shift+K`
 * (Windows/Linux) and fires the provided `onTrigger` callback.
 */
export class KeyboardTrigger implements TriggerPlugin {
  readonly name = 'keyboard';
  readonly platform = 'web' as const;

  private handler: ((e: KeyboardEvent) => void) | null = null;

  activate(onTrigger: () => void): void {
    // Remove any previously-registered handler to avoid duplicates.
    this.deactivate();

    this.handler = (e: KeyboardEvent) => {
      // Determine the modifier key based on platform.
      const isMac = /mac|ipod|iphone|ipad/i.test(navigator.userAgent);
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;

      if (modifierPressed && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        onTrigger();
      }
    };

    document.addEventListener('keydown', this.handler);
  }

  deactivate(): void {
    if (this.handler) {
      document.removeEventListener('keydown', this.handler);
      this.handler = null;
    }
  }
}
