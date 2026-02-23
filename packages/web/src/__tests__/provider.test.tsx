import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, createElement, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { ShakeNbakeProvider, ShakeNbakeContext } from '../ShakeNbakeProvider.js';
import type { ShakeNbakeConfig, DestinationAdapter } from '@shakenbake/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAdapter(): DestinationAdapter {
  return {
    name: 'mock',
    uploadImage: vi.fn(async () => 'https://example.com/img.png'),
    createIssue: vi.fn(async () => ({
      url: 'https://example.com/issue/1',
      id: '1',
      success: true,
    })),
    testConnection: vi.fn(async () => true),
  };
}

function createConfig(overrides?: Partial<ShakeNbakeConfig>): ShakeNbakeConfig {
  return {
    enabled: true,
    destination: mockAdapter(),
    ...overrides,
  };
}

// A test component that captures the context value.
function ContextReader(props: {
  onContext: (ctx: ReturnType<typeof useContext<typeof ShakeNbakeContext>>) => void;
}): React.JSX.Element {
  const ctx = useContext(ShakeNbakeContext);
  props.onContext(ctx);
  return createElement('div', { 'data-testid': 'context-reader' }, 'child');
}

function renderProvider(
  config: ShakeNbakeConfig,
  children?: React.ReactNode,
): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const element = createElement(
    ShakeNbakeProvider,
    { config },
    children ?? createElement('div', { 'data-testid': 'app-child' }, 'App Content'),
  );

  act(() => {
    root.render(element);
  });

  return { container, root };
}

function cleanup(
  container: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
) {
  act(() => {
    root.unmount();
  });
  container.remove();
  // Clean up any overlays left on body.
  document.body.querySelectorAll('[data-testid]').forEach((el) => {
    if (el.parentElement === document.body) el.remove();
  });
}

// ---------------------------------------------------------------------------
// Canvas mock (for tests that trigger annotation state)
// ---------------------------------------------------------------------------

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

beforeEach(() => {
  const mockCtx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    strokeRect: vi.fn(),
    ellipse: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = vi.fn(
    (contextId: string) => (contextId === '2d' ? mockCtx : null),
  );
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/png;base64,COMPOSITED',
  );
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShakeNbakeProvider', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    if (container) cleanup(container, root);
  });

  it('renders children', () => {
    const config = createConfig();
    ({ container, root } = renderProvider(config));

    const child = container.querySelector('[data-testid="app-child"]');
    expect(child).not.toBeNull();
    expect(child!.textContent).toBe('App Content');
  });

  it('provides context via ShakeNbakeContext', () => {
    const config = createConfig();
    let capturedCtx: ReturnType<typeof useContext<typeof ShakeNbakeContext>> = null;

    const reader = createElement(ContextReader, {
      onContext: (ctx) => {
        capturedCtx = ctx;
      },
    });

    ({ container, root } = renderProvider(config, reader));

    expect(capturedCtx).not.toBeNull();
    expect(capturedCtx!.isOpen).toBe(false);
    expect(capturedCtx!.currentStep).toBe('idle');
    expect(typeof capturedCtx!.trigger).toBe('function');
    expect(capturedCtx!.config.enabled).toBe(true);
  });

  it('trigger() starts the flow when enabled', () => {
    const config = createConfig({ enabled: true });
    let capturedCtx: ReturnType<typeof useContext<typeof ShakeNbakeContext>> = null;

    const reader = createElement(ContextReader, {
      onContext: (ctx) => {
        capturedCtx = ctx;
      },
    });

    ({ container, root } = renderProvider(config, reader));

    // Initial state.
    expect(capturedCtx!.isOpen).toBe(false);
    expect(capturedCtx!.currentStep).toBe('idle');

    // Trigger the flow — note: this will transition to 'triggered' then
    // immediately to 'capturing', but since we have no capture mock that
    // resolves, it may move to 'error'. What matters is that it's no longer 'idle'.
    act(() => {
      capturedCtx!.trigger();
    });

    expect(capturedCtx!.isOpen).toBe(true);
  });

  it('trigger() does nothing when disabled', () => {
    const config = createConfig({ enabled: false });
    let capturedCtx: ReturnType<typeof useContext<typeof ShakeNbakeContext>> = null;

    const reader = createElement(ContextReader, {
      onContext: (ctx) => {
        capturedCtx = ctx;
      },
    });

    ({ container, root } = renderProvider(config, reader));

    act(() => {
      capturedCtx!.trigger();
    });

    expect(capturedCtx!.isOpen).toBe(false);
    expect(capturedCtx!.currentStep).toBe('idle');
  });

  it('does not render overlays in idle state', () => {
    const config = createConfig();
    ({ container, root } = renderProvider(config));

    expect(document.body.querySelector('[data-testid="drawing-canvas-overlay"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="report-form-overlay"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="shakenbake-success-overlay"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="shakenbake-error-overlay"]')).toBeNull();
  });

  it('config.enabled=false does not register triggers', () => {
    const config = createConfig({ enabled: false });
    ({ container, root } = renderProvider(config));

    // The FAB button should not be in the DOM.
    const fab = document.body.querySelector('[aria-label="Report a bug"]');
    expect(fab).toBeNull();
  });

  it('shows FAB when config.ui.showFAB is true', async () => {
    const config = createConfig({
      ui: { showFAB: true, position: 'bottom-right' },
    });
    ({ container, root } = renderProvider(config));

    // Flush microtasks from async activateTriggers
    await act(async () => {});

    const fab = document.body.querySelector('[aria-label="Report a bug"]');
    expect(fab).not.toBeNull();
  });

  it('does not show FAB when config.ui.showFAB is not set', () => {
    const config = createConfig();
    ({ container, root } = renderProvider(config));

    const fab = document.body.querySelector('[aria-label="Report a bug"]');
    expect(fab).toBeNull();
  });

  it('cleans up triggers and FAB on unmount', async () => {
    const config = createConfig({
      ui: { showFAB: true },
    });
    ({ container, root } = renderProvider(config));

    // Flush microtasks from async activateTriggers
    await act(async () => {});

    // FAB should exist.
    expect(document.body.querySelector('[aria-label="Report a bug"]')).not.toBeNull();

    // Unmount.
    act(() => {
      root.unmount();
    });
    container.remove();

    // FAB should be removed.
    expect(document.body.querySelector('[aria-label="Report a bug"]')).toBeNull();

    // Prevent double-cleanup.
    container = null as unknown as HTMLDivElement;
  });
});
