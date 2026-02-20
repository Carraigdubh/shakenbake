import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { DrawingCanvas } from '../annotate/DrawingCanvas.js';
import type { DrawingCanvasProps, DrawingOperation } from '../annotate/types.js';
import {
  PALETTE_COLORS,
  STROKE_WIDTHS,
  TOOL_LABELS,
} from '../annotate/types.js';
import {
  renderOperation,
  renderAllOperations,
  compositeImage,
} from '../annotate/renderer.js';

// ---------------------------------------------------------------------------
// Canvas 2D context mock — jsdom does not implement getContext('2d')
// ---------------------------------------------------------------------------

function createMockContext(): CanvasRenderingContext2D {
  const ctx = {
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
  return ctx;
}

let mockCtx: CanvasRenderingContext2D;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

beforeEach(() => {
  mockCtx = createMockContext();

  // Override getContext to return our mock.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = vi.fn(
    (contextId: string) => {
      if (contextId === '2d') return mockCtx;
      return null;
    },
  );

  // Override toDataURL.
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/png;base64,COMPOSITED',
  );
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
});

// ---------------------------------------------------------------------------
// Helper to render the component into a real DOM node
// ---------------------------------------------------------------------------

const FAKE_SCREENSHOT = 'data:image/png;base64,fakeScreenshot';
const FAKE_DIMENSIONS = { width: 800, height: 600 };

function renderCanvas(
  overrides: Partial<DrawingCanvasProps> = {},
): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const props: DrawingCanvasProps = {
    screenshot: FAKE_SCREENSHOT,
    dimensions: FAKE_DIMENSIONS,
    onDone: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  const root = createRoot(container);
  act(() => {
    root.render(createElement(DrawingCanvas, props));
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
}

// ---------------------------------------------------------------------------
// Tests: Component rendering
// ---------------------------------------------------------------------------

describe('DrawingCanvas', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    if (container) cleanup(container, root);
  });

  it('renders without crashing', () => {
    ({ container, root } = renderCanvas());
    const overlay = container.querySelector(
      '[data-testid="drawing-canvas-overlay"]',
    );
    expect(overlay).not.toBeNull();
  });

  it('renders a canvas element', () => {
    ({ container, root } = renderCanvas());
    const canvas = container.querySelector(
      '[data-testid="drawing-canvas"]',
    ) as HTMLCanvasElement | null;
    expect(canvas).not.toBeNull();
    expect(canvas!.width).toBe(800);
    expect(canvas!.height).toBe(600);
  });

  it('renders the toolbar', () => {
    ({ container, root } = renderCanvas());
    const toolbar = container.querySelector(
      '[data-testid="drawing-canvas-toolbar"]',
    );
    expect(toolbar).not.toBeNull();
  });

  it('renders tool buttons for pen, rectangle, arrow, circle', () => {
    ({ container, root } = renderCanvas());
    for (const tool of ['pen', 'rectangle', 'arrow', 'circle'] as const) {
      const btn = container.querySelector(
        `[data-testid="tool-${tool}"]`,
      );
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe(TOOL_LABELS[tool]);
    }
  });

  it('pen tool is selected by default', () => {
    ({ container, root } = renderCanvas());
    const penBtn = container.querySelector(
      '[data-testid="tool-pen"]',
    ) as HTMLButtonElement;
    expect(penBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking a tool button changes active tool', () => {
    ({ container, root } = renderCanvas());

    const rectBtn = container.querySelector(
      '[data-testid="tool-rectangle"]',
    ) as HTMLButtonElement;
    act(() => {
      rectBtn.click();
    });

    expect(rectBtn.getAttribute('aria-pressed')).toBe('true');

    const penBtn = container.querySelector(
      '[data-testid="tool-pen"]',
    ) as HTMLButtonElement;
    expect(penBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders colour palette swatches', () => {
    ({ container, root } = renderCanvas());
    for (const color of PALETTE_COLORS) {
      const swatch = container.querySelector(
        `[data-testid="color-${color}"]`,
      );
      expect(swatch).not.toBeNull();
    }
  });

  it('first colour (red) is selected by default', () => {
    ({ container, root } = renderCanvas());
    const redSwatch = container.querySelector(
      `[data-testid="color-${PALETTE_COLORS[0]}"]`,
    ) as HTMLButtonElement;
    expect(redSwatch.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking a colour swatch changes active colour', () => {
    ({ container, root } = renderCanvas());

    const blueSwatch = container.querySelector(
      `[data-testid="color-${PALETTE_COLORS[2]}"]`,
    ) as HTMLButtonElement;
    act(() => {
      blueSwatch.click();
    });
    expect(blueSwatch.getAttribute('aria-pressed')).toBe('true');

    const redSwatch = container.querySelector(
      `[data-testid="color-${PALETTE_COLORS[0]}"]`,
    ) as HTMLButtonElement;
    expect(redSwatch.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders stroke width buttons', () => {
    ({ container, root } = renderCanvas());
    for (const sw of STROKE_WIDTHS) {
      const btn = container.querySelector(
        `[data-testid="stroke-${sw.value}"]`,
      );
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe(sw.label);
    }
  });

  it('medium stroke is selected by default', () => {
    ({ container, root } = renderCanvas());
    const medBtn = container.querySelector(
      '[data-testid="stroke-4"]',
    ) as HTMLButtonElement;
    expect(medBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking a stroke width button changes active stroke', () => {
    ({ container, root } = renderCanvas());

    const thickBtn = container.querySelector(
      '[data-testid="stroke-8"]',
    ) as HTMLButtonElement;
    act(() => {
      thickBtn.click();
    });
    expect(thickBtn.getAttribute('aria-pressed')).toBe('true');

    const medBtn = container.querySelector(
      '[data-testid="stroke-4"]',
    ) as HTMLButtonElement;
    expect(medBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders Undo and Redo buttons', () => {
    ({ container, root } = renderCanvas());
    expect(
      container.querySelector('[data-testid="btn-undo"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="btn-redo"]'),
    ).not.toBeNull();
  });

  it('Undo is disabled when there are no operations', () => {
    ({ container, root } = renderCanvas());
    const undoBtn = container.querySelector(
      '[data-testid="btn-undo"]',
    ) as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(true);
  });

  it('Redo is disabled when redo stack is empty', () => {
    ({ container, root } = renderCanvas());
    const redoBtn = container.querySelector(
      '[data-testid="btn-redo"]',
    ) as HTMLButtonElement;
    expect(redoBtn.disabled).toBe(true);
  });

  it('renders Cancel and Done buttons', () => {
    ({ container, root } = renderCanvas());
    expect(
      container.querySelector('[data-testid="btn-cancel"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="btn-done"]'),
    ).not.toBeNull();
  });

  it('Cancel button calls onCancel', () => {
    const onCancel = vi.fn();
    ({ container, root } = renderCanvas({ onCancel }));

    const cancelBtn = container.querySelector(
      '[data-testid="btn-cancel"]',
    ) as HTMLButtonElement;
    act(() => {
      cancelBtn.click();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Done button calls onDone', async () => {
    // Mock Image so that onload fires synchronously — jsdom does not
    // decode data-URI images, so compositeImage would hang without this.
    const OrigImage = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      set src(_: string) {
        // Fire onload on the next microtask.
        Promise.resolve().then(() => this.onload?.());
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Image = MockImage as any;

    const onDone = vi.fn();
    ({ container, root } = renderCanvas({ onDone }));

    const doneBtn = container.querySelector(
      '[data-testid="btn-done"]',
    ) as HTMLButtonElement;

    await act(async () => {
      doneBtn.click();
      // Flush microtasks and timers to let compositeImage resolve.
      await new Promise((r) => setTimeout(r, 50));
    });

    globalThis.Image = OrigImage;

    expect(onDone).toHaveBeenCalledTimes(1);
    // First argument is annotated base64, second is original base64.
    expect(onDone).toHaveBeenCalledWith(
      expect.stringContaining('data:image/png;base64,'),
      FAKE_SCREENSHOT,
    );
  });

  it('applies dark theme by default', () => {
    ({ container, root } = renderCanvas());
    const overlay = container.querySelector(
      '[data-testid="drawing-canvas-overlay"]',
    ) as HTMLElement;
    expect(overlay.style.backgroundColor).toBe('rgb(26, 26, 26)');
  });

  it('applies light theme when specified', () => {
    ({ container, root } = renderCanvas({ theme: 'light' }));
    const overlay = container.querySelector(
      '[data-testid="drawing-canvas-overlay"]',
    ) as HTMLElement;
    expect(overlay.style.backgroundColor).toBe('rgb(240, 240, 240)');
  });

  it('canvas has crosshair cursor', () => {
    ({ container, root } = renderCanvas());
    const canvas = container.querySelector(
      '[data-testid="drawing-canvas"]',
    ) as HTMLCanvasElement;
    expect(canvas.style.cursor).toBe('crosshair');
  });

  it('canvas has touch-action none for touch drawing', () => {
    ({ container, root } = renderCanvas());
    const canvas = container.querySelector(
      '[data-testid="drawing-canvas"]',
    ) as HTMLCanvasElement;
    expect(canvas.style.touchAction).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// Tests: Renderer functions (unit tests for drawing logic)
// ---------------------------------------------------------------------------

describe('renderOperation', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('draws a pen stroke', () => {
    const op: DrawingOperation = {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ],
    };
    renderOperation(ctx, op);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(30, 40);
    expect(ctx.lineTo).toHaveBeenCalledWith(50, 60);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.strokeStyle).toBe('#FF0000');
    expect(ctx.lineWidth).toBe(4);
  });

  it('draws a single-point pen stroke as a dot', () => {
    const op: DrawingOperation = {
      tool: 'pen',
      color: '#0000FF',
      strokeWidth: 2,
      points: [{ x: 5, y: 5 }],
    };
    renderOperation(ctx, op);

    expect(ctx.moveTo).toHaveBeenCalledWith(5, 5);
    expect(ctx.lineTo).toHaveBeenCalledWith(5.1, 5.1);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('does nothing for pen with no points', () => {
    const op: DrawingOperation = {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [],
    };
    renderOperation(ctx, op);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('draws a rectangle', () => {
    const op: DrawingOperation = {
      tool: 'rectangle',
      color: '#00FF00',
      strokeWidth: 2,
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 110, y: 60 },
    };
    renderOperation(ctx, op);

    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 10, 100, 50);
    expect(ctx.strokeStyle).toBe('#00FF00');
    expect(ctx.lineWidth).toBe(2);
  });

  it('draws a rectangle with inverted corners', () => {
    const op: DrawingOperation = {
      tool: 'rectangle',
      color: '#FF0000',
      strokeWidth: 2,
      startPoint: { x: 100, y: 80 },
      endPoint: { x: 20, y: 30 },
    };
    renderOperation(ctx, op);

    // Min corner is (20, 30), size is 80x50.
    expect(ctx.strokeRect).toHaveBeenCalledWith(20, 30, 80, 50);
  });

  it('does nothing for rectangle without endpoints', () => {
    const op: DrawingOperation = {
      tool: 'rectangle',
      color: '#FF0000',
      strokeWidth: 2,
    };
    renderOperation(ctx, op);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it('draws an arrow with line and arrowhead', () => {
    const op: DrawingOperation = {
      tool: 'arrow',
      color: '#FFDD00',
      strokeWidth: 4,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 100, y: 0 },
    };
    renderOperation(ctx, op);

    // Line.
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 0);
    expect(ctx.stroke).toHaveBeenCalled();

    // Arrowhead — closePath + fill.
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('does nothing for arrow without endpoints', () => {
    const op: DrawingOperation = {
      tool: 'arrow',
      color: '#FF0000',
      strokeWidth: 2,
    };
    renderOperation(ctx, op);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('draws a circle / ellipse', () => {
    const op: DrawingOperation = {
      tool: 'circle',
      color: '#4CAF50',
      strokeWidth: 2,
      startPoint: { x: 50, y: 50 },
      endPoint: { x: 80, y: 70 },
    };
    renderOperation(ctx, op);

    // Ellipse with center (50,50), rx=30, ry=20.
    expect(ctx.ellipse).toHaveBeenCalledWith(50, 50, 30, 20, 0, 0, Math.PI * 2);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('does nothing for circle without endpoints', () => {
    const op: DrawingOperation = {
      tool: 'circle',
      color: '#FF0000',
      strokeWidth: 2,
    };
    renderOperation(ctx, op);
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });

  it('does nothing for eraser tool', () => {
    const op: DrawingOperation = {
      tool: 'eraser',
      color: '#FF0000',
      strokeWidth: 2,
    };
    renderOperation(ctx, op);

    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.strokeRect).not.toHaveBeenCalled();
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });
});

describe('renderAllOperations', () => {
  it('replays all operations in order', () => {
    const ctx = createMockContext();
    const ops: DrawingOperation[] = [
      {
        tool: 'pen',
        color: '#FF0000',
        strokeWidth: 2,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      },
      {
        tool: 'rectangle',
        color: '#00FF00',
        strokeWidth: 4,
        startPoint: { x: 20, y: 20 },
        endPoint: { x: 80, y: 80 },
      },
    ];

    renderAllOperations(ctx, ops);

    // Pen stroke calls.
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 10);
    // Rectangle call.
    expect(ctx.strokeRect).toHaveBeenCalledWith(20, 20, 60, 60);
  });

  it('handles empty operations array', () => {
    const ctx = createMockContext();
    renderAllOperations(ctx, []);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: Type/constant exports
// ---------------------------------------------------------------------------

describe('types and constants', () => {
  it('PALETTE_COLORS contains 6 colours', () => {
    expect(PALETTE_COLORS).toHaveLength(6);
  });

  it('PALETTE_COLORS first entry is red', () => {
    expect(PALETTE_COLORS[0]).toBe('#FF0000');
  });

  it('STROKE_WIDTHS has thin, medium, thick', () => {
    expect(STROKE_WIDTHS).toHaveLength(3);
    expect(STROKE_WIDTHS.map((s) => s.label)).toEqual([
      'Thin',
      'Medium',
      'Thick',
    ]);
    expect(STROKE_WIDTHS.map((s) => s.value)).toEqual([2, 4, 8]);
  });

  it('TOOL_LABELS contains all expected tools', () => {
    expect(Object.keys(TOOL_LABELS)).toEqual(
      expect.arrayContaining(['pen', 'rectangle', 'arrow', 'circle', 'eraser']),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: compositeImage
// ---------------------------------------------------------------------------

describe('compositeImage', () => {
  it('returns a base64 PNG string', async () => {
    // compositeImage will fail because Image.onload does not fire in
    // jsdom for data URIs by default. We test the catch path.
    // Even if it succeeds (with our mock), it should return a data URL.

    // For the Image to load in jsdom, we need to mock it.
    const OrigImage = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      set src(_: string) {
        // Immediately fire onload.
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Image = MockImage as any;

    try {
      const result = await compositeImage(
        FAKE_SCREENSHOT,
        FAKE_DIMENSIONS,
        [],
      );
      expect(result).toMatch(/^data:image\/png;base64,/);
    } finally {
      globalThis.Image = OrigImage;
    }
  });

  it('replays operations onto the composite canvas', async () => {
    const OrigImage = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Image = MockImage as any;

    const ops: DrawingOperation[] = [
      {
        tool: 'pen',
        color: '#FF0000',
        strokeWidth: 2,
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
        ],
      },
    ];

    try {
      const result = await compositeImage(FAKE_SCREENSHOT, FAKE_DIMENSIONS, ops);
      expect(result).toMatch(/^data:image\/png;base64,/);
      // The mock context should have been used for drawing.
      expect(mockCtx.drawImage).toHaveBeenCalled();
    } finally {
      globalThis.Image = OrigImage;
    }
  });
});
