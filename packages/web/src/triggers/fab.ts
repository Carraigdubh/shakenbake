// ---------------------------------------------------------------------------
// @shakenbake/web — FABTrigger plugin
// Renders a floating action button in the DOM to trigger bug-report flow.
// Uses plain DOM manipulation (not React) so it works outside the React tree.
// ---------------------------------------------------------------------------

import type { TriggerPlugin } from '@shakenbake/core';

/** Configuration options for the FAB trigger. */
export interface FABTriggerConfig {
  /** Which corner to pin the button to. Defaults to `'bottom-right'`. */
  position?: 'bottom-right' | 'bottom-left';
}

// SVG bug icon (24x24 viewBox) used inside the button.
const BUG_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`;

/**
 * Floating Action Button trigger for the web SDK.
 *
 * When activated, injects a fixed-position button into the DOM at the
 * specified corner.  Clicking the button fires `onTrigger`.
 */
export class FABTrigger implements TriggerPlugin {
  readonly name = 'fab';
  readonly platform = 'web' as const;

  private button: HTMLButtonElement | null = null;
  private readonly config: FABTriggerConfig;

  constructor(config?: FABTriggerConfig) {
    this.config = config ?? {};
  }

  activate(onTrigger: () => void): void {
    // Remove any previously-created button to avoid duplicates.
    this.deactivate();

    const btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Report a bug');

    const position = this.config.position ?? 'bottom-right';

    // Apply inline styles so no external CSS is required.
    const baseStyles: Partial<CSSStyleDeclaration> = {
      position: 'fixed',
      bottom: '20px',
      zIndex: '2147483647',
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: '#6366f1',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      padding: '0',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    };

    if (position === 'bottom-left') {
      baseStyles.left = '20px';
    } else {
      baseStyles.right = '20px';
    }

    Object.assign(btn.style, baseStyles);

    btn.innerHTML = BUG_ICON_SVG;

    // Hover / active visual feedback.
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.08)';
      btn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
    });

    btn.addEventListener('click', () => {
      onTrigger();
    });

    document.body.appendChild(btn);
    this.button = btn;
  }

  deactivate(): void {
    if (this.button) {
      this.button.remove();
      this.button = null;
    }
  }
}
