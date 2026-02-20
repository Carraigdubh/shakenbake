// ---------------------------------------------------------------------------
// Tests for annotation module — DrawingCanvas, types, and undo/redo logic
//
// Since @shopify/react-native-skia requires native modules that are not
// available in the Node test environment, we:
// 1. Mock Skia entirely for any component-level assertions
// 2. Test the pure undo/redo logic via the non-React state functions
// 3. Verify module exports are correctly shaped
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock peer dependencies before importing anything that touches them
// ---------------------------------------------------------------------------

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
  Platform: { OS: 'ios', Version: '17.0' },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }) },
  PixelRatio: { get: () => 3, getFontScale: () => 1 },
}));

vi.mock('@shopify/react-native-skia', () => {
  const mockPath = {
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    close: vi.fn(),
    reset: vi.fn(),
    copy: vi.fn(() => mockPath),
  };
  return {
    Canvas: 'SkiaCanvas',
    Image: 'SkiaImage',
    Path: 'SkiaPath',
    Rect: 'SkiaRect',
    Circle: 'SkiaCircle',
    Line: 'SkiaLine',
    Skia: {
      Path: { Make: () => ({ ...mockPath }) },
      Data: { fromBase64: () => ({}) },
    },
    makeImageFromEncoded: () => ({
      width: () => 390,
      height: () => 844,
      encodeToBase64: () => 'mock-base64-data',
    }),
    useCanvasRef: () => ({ current: null }),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createDrawingState,
  addOperation,
  undoOperation,
  redoOperation,
  clearOperations,
} from '../annotate/useDrawingOperations.js';

import type {
  DrawingState,
} from '../annotate/useDrawingOperations.js';

import type {
  DrawingOperation,
  DrawingTool,
  DrawingColor,
  StrokeSize,
  Point,
} from '../annotate/types.js';

import {
  DRAWING_COLORS,
  DEFAULT_COLOR,
  STROKE_WIDTHS,
  DEFAULT_STROKE_SIZE,
} from '../annotate/types.js';

import { DrawingCanvas } from '../annotate/DrawingCanvas.js';

// ---------------------------------------------------------------------------
// 1. Module exports
// ---------------------------------------------------------------------------

describe('Module exports', () => {
  it('DrawingCanvas is a function component', () => {
    expect(typeof DrawingCanvas).toBe('function');
  });

  it('pure state functions are exported', () => {
    expect(typeof createDrawingState).toBe('function');
    expect(typeof addOperation).toBe('function');
    expect(typeof undoOperation).toBe('function');
    expect(typeof redoOperation).toBe('function');
    expect(typeof clearOperations).toBe('function');
  });

  it('re-exports from index', async () => {
    const index = await import('../index.js');
    expect(typeof index.DrawingCanvas).toBe('function');
    expect(typeof index.createDrawingState).toBe('function');
    expect(typeof index.addOperation).toBe('function');
    expect(typeof index.undoOperation).toBe('function');
    expect(typeof index.redoOperation).toBe('function');
    expect(typeof index.clearOperations).toBe('function');
    expect(index.DRAWING_COLORS).toBeDefined();
    expect(index.DEFAULT_COLOR).toBe('#FF0000');
    expect(index.STROKE_WIDTHS).toBeDefined();
    expect(index.DEFAULT_STROKE_SIZE).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// 2. Type constants
// ---------------------------------------------------------------------------

describe('Drawing type constants', () => {
  it('DRAWING_COLORS has 6 colors', () => {
    expect(DRAWING_COLORS).toHaveLength(6);
    expect(DRAWING_COLORS).toContain('#FF0000');
    expect(DRAWING_COLORS).toContain('#FFFF00');
    expect(DRAWING_COLORS).toContain('#0066FF');
    expect(DRAWING_COLORS).toContain('#00CC00');
    expect(DRAWING_COLORS).toContain('#FFFFFF');
    expect(DRAWING_COLORS).toContain('#000000');
  });

  it('DEFAULT_COLOR is red', () => {
    expect(DEFAULT_COLOR).toBe('#FF0000');
  });

  it('STROKE_WIDTHS maps sizes to pixel values', () => {
    expect(STROKE_WIDTHS.thin).toBe(2);
    expect(STROKE_WIDTHS.medium).toBe(4);
    expect(STROKE_WIDTHS.thick).toBe(8);
  });

  it('DEFAULT_STROKE_SIZE is medium', () => {
    expect(DEFAULT_STROKE_SIZE).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// 3. Pure undo/redo logic (non-React state functions)
// ---------------------------------------------------------------------------

describe('createDrawingState', () => {
  it('returns empty initial state', () => {
    const state = createDrawingState();
    expect(state.operations).toEqual([]);
    expect(state.redoStack).toEqual([]);
    expect(state.currentOperation).toBeNull();
    expect(state.nextId).toBe(1);
  });
});

describe('addOperation', () => {
  it('adds an operation with auto-incrementing id', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    });

    expect(state.operations).toHaveLength(1);
    expect(state.operations[0]!.id).toBe(1);
    expect(state.operations[0]!.tool).toBe('pen');
    expect(state.nextId).toBe(2);
  });

  it('clears redo stack when adding a new operation', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 0, y: 0 }],
    });
    state = addOperation(state, {
      tool: 'rectangle',
      color: '#0066FF',
      strokeWidth: 2,
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 50, y: 50 },
    });

    // Undo to put one item in redo stack
    state = undoOperation(state);
    expect(state.redoStack).toHaveLength(1);

    // Adding a new operation clears redo
    state = addOperation(state, {
      tool: 'circle',
      color: '#00CC00',
      strokeWidth: 8,
      startPoint: { x: 20, y: 20 },
      endPoint: { x: 40, y: 40 },
    });
    expect(state.redoStack).toHaveLength(0);
  });

  it('preserves shape tool properties', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'arrow',
      color: '#FFFF00',
      strokeWidth: 4,
      startPoint: { x: 100, y: 100 },
      endPoint: { x: 200, y: 200 },
    });

    const op = state.operations[0]!;
    expect(op.tool).toBe('arrow');
    expect(op.startPoint).toEqual({ x: 100, y: 100 });
    expect(op.endPoint).toEqual({ x: 200, y: 200 });
  });
});

describe('undoOperation', () => {
  it('moves last operation from operations to redoStack', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 0, y: 0 }],
    });
    state = addOperation(state, {
      tool: 'rectangle',
      color: '#0066FF',
      strokeWidth: 2,
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 50, y: 50 },
    });

    expect(state.operations).toHaveLength(2);
    expect(state.redoStack).toHaveLength(0);

    state = undoOperation(state);
    expect(state.operations).toHaveLength(1);
    expect(state.redoStack).toHaveLength(1);
    expect(state.redoStack[0]!.tool).toBe('rectangle');
  });

  it('returns unchanged state if nothing to undo', () => {
    const state = createDrawingState();
    const result = undoOperation(state);
    expect(result).toBe(state); // same reference — no mutation
  });

  it('can undo all operations', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 0, y: 0 }],
    });
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 5, y: 5 }],
    });
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 10, y: 10 }],
    });

    state = undoOperation(state);
    state = undoOperation(state);
    state = undoOperation(state);

    expect(state.operations).toHaveLength(0);
    expect(state.redoStack).toHaveLength(3);
  });
});

describe('redoOperation', () => {
  it('moves last item from redoStack back to operations', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 0, y: 0 }],
    });
    state = undoOperation(state);
    expect(state.operations).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);

    state = redoOperation(state);
    expect(state.operations).toHaveLength(1);
    expect(state.redoStack).toHaveLength(0);
    expect(state.operations[0]!.tool).toBe('pen');
  });

  it('returns unchanged state if nothing to redo', () => {
    const state = createDrawingState();
    const result = redoOperation(state);
    expect(result).toBe(state);
  });

  it('supports multiple undo then redo in order', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 1, y: 1 }],
    });
    state = addOperation(state, {
      tool: 'rectangle',
      color: '#0066FF',
      strokeWidth: 2,
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 50, y: 50 },
    });
    state = addOperation(state, {
      tool: 'circle',
      color: '#00CC00',
      strokeWidth: 8,
      startPoint: { x: 20, y: 20 },
      endPoint: { x: 40, y: 40 },
    });

    // Undo all three
    state = undoOperation(state);
    state = undoOperation(state);
    state = undoOperation(state);
    expect(state.operations).toHaveLength(0);
    expect(state.redoStack).toHaveLength(3);

    // Redo two
    state = redoOperation(state);
    state = redoOperation(state);
    expect(state.operations).toHaveLength(2);
    expect(state.redoStack).toHaveLength(1);
    expect(state.operations[0]!.tool).toBe('pen');
    expect(state.operations[1]!.tool).toBe('rectangle');
  });
});

describe('clearOperations', () => {
  it('clears all operations, redo stack, and current operation', () => {
    let state = createDrawingState();
    state = addOperation(state, {
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [{ x: 0, y: 0 }],
    });
    state = addOperation(state, {
      tool: 'rectangle',
      color: '#0066FF',
      strokeWidth: 2,
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 50, y: 50 },
    });
    state = undoOperation(state);
    state = {
      ...state,
      currentOperation: {
        id: 99,
        tool: 'circle',
        color: '#00CC00',
        strokeWidth: 8,
        startPoint: { x: 20, y: 20 },
        endPoint: { x: 40, y: 40 },
      },
    };

    state = clearOperations(state);
    expect(state.operations).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.currentOperation).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. DrawingOperation type shapes
// ---------------------------------------------------------------------------

describe('DrawingOperation type shapes', () => {
  it('pen operation has points', () => {
    const op: DrawingOperation = {
      id: 1,
      tool: 'pen',
      color: '#FF0000',
      strokeWidth: 4,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 15 },
      ],
    };
    expect(op.points).toHaveLength(3);
    expect(op.startPoint).toBeUndefined();
    expect(op.endPoint).toBeUndefined();
  });

  it('rectangle operation has start and end points', () => {
    const op: DrawingOperation = {
      id: 2,
      tool: 'rectangle',
      color: '#0066FF',
      strokeWidth: 2,
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 100, y: 80 },
    };
    expect(op.startPoint).toEqual({ x: 10, y: 10 });
    expect(op.endPoint).toEqual({ x: 100, y: 80 });
    expect(op.points).toBeUndefined();
  });

  it('arrow operation has start and end points', () => {
    const op: DrawingOperation = {
      id: 3,
      tool: 'arrow',
      color: '#FFFF00',
      strokeWidth: 4,
      startPoint: { x: 50, y: 50 },
      endPoint: { x: 200, y: 150 },
    };
    expect(op.tool).toBe('arrow');
    expect(op.startPoint).toBeDefined();
    expect(op.endPoint).toBeDefined();
  });

  it('circle operation has center and edge points', () => {
    const op: DrawingOperation = {
      id: 4,
      tool: 'circle',
      color: '#00CC00',
      strokeWidth: 8,
      startPoint: { x: 100, y: 100 }, // center
      endPoint: { x: 150, y: 100 }, // edge (radius = 50)
    };
    expect(op.tool).toBe('circle');
    const radius = Math.sqrt(
      (op.endPoint!.x - op.startPoint!.x) ** 2 +
        (op.endPoint!.y - op.startPoint!.y) ** 2,
    );
    expect(radius).toBe(50);
  });

  it('eraser operation has points like pen', () => {
    const op: DrawingOperation = {
      id: 5,
      tool: 'eraser',
      color: '#000000',
      strokeWidth: 12,
      points: [{ x: 30, y: 30 }, { x: 40, y: 40 }],
    };
    expect(op.tool).toBe('eraser');
    expect(op.points).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Integration-style: addOperation + undo/redo sequencing
// ---------------------------------------------------------------------------

describe('Undo/redo integration scenarios', () => {
  it('new operation after undo clears redo stack (branching history)', () => {
    let state = createDrawingState();

    // Draw three things
    state = addOperation(state, {
      tool: 'pen', color: '#FF0000', strokeWidth: 4, points: [{ x: 0, y: 0 }],
    });
    state = addOperation(state, {
      tool: 'rectangle', color: '#0066FF', strokeWidth: 2,
      startPoint: { x: 10, y: 10 }, endPoint: { x: 50, y: 50 },
    });
    state = addOperation(state, {
      tool: 'circle', color: '#00CC00', strokeWidth: 8,
      startPoint: { x: 20, y: 20 }, endPoint: { x: 40, y: 40 },
    });

    // Undo two
    state = undoOperation(state);
    state = undoOperation(state);
    expect(state.operations).toHaveLength(1);
    expect(state.redoStack).toHaveLength(2);

    // Draw something new (should clear redo)
    state = addOperation(state, {
      tool: 'arrow', color: '#FFFF00', strokeWidth: 4,
      startPoint: { x: 0, y: 0 }, endPoint: { x: 100, y: 100 },
    });
    expect(state.operations).toHaveLength(2);
    expect(state.redoStack).toHaveLength(0);
    expect(state.operations[1]!.tool).toBe('arrow');
  });

  it('maintains operation order through undo-redo cycle', () => {
    let state = createDrawingState();

    state = addOperation(state, {
      tool: 'pen', color: '#FF0000', strokeWidth: 4, points: [{ x: 1, y: 1 }],
    });
    state = addOperation(state, {
      tool: 'pen', color: '#0066FF', strokeWidth: 4, points: [{ x: 2, y: 2 }],
    });
    state = addOperation(state, {
      tool: 'pen', color: '#00CC00', strokeWidth: 4, points: [{ x: 3, y: 3 }],
    });

    const originalOps = [...state.operations];

    // Undo all, redo all
    state = undoOperation(state);
    state = undoOperation(state);
    state = undoOperation(state);
    state = redoOperation(state);
    state = redoOperation(state);
    state = redoOperation(state);

    // Should be back to original order
    expect(state.operations).toHaveLength(3);
    expect(state.operations[0]!.color).toBe(originalOps[0]!.color);
    expect(state.operations[1]!.color).toBe(originalOps[1]!.color);
    expect(state.operations[2]!.color).toBe(originalOps[2]!.color);
  });

  it('nextId keeps incrementing across add/undo/redo', () => {
    let state = createDrawingState();

    state = addOperation(state, {
      tool: 'pen', color: '#FF0000', strokeWidth: 4, points: [{ x: 0, y: 0 }],
    });
    expect(state.nextId).toBe(2);

    state = undoOperation(state);
    // nextId does not decrease on undo
    expect(state.nextId).toBe(2);

    state = redoOperation(state);
    // nextId does not change on redo
    expect(state.nextId).toBe(2);

    state = addOperation(state, {
      tool: 'pen', color: '#FF0000', strokeWidth: 4, points: [{ x: 5, y: 5 }],
    });
    expect(state.nextId).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 6. Tool type validation
// ---------------------------------------------------------------------------

describe('Drawing tool types', () => {
  it('all tool types are valid', () => {
    const tools: DrawingTool[] = ['pen', 'rectangle', 'arrow', 'circle', 'eraser'];
    expect(tools).toHaveLength(5);
  });

  it('all color constants are valid hex', () => {
    for (const c of DRAWING_COLORS) {
      expect(c).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('all stroke sizes map to positive numbers', () => {
    const sizes: StrokeSize[] = ['thin', 'medium', 'thick'];
    for (const s of sizes) {
      expect(STROKE_WIDTHS[s]).toBeGreaterThan(0);
    }
    // Ensure ordering: thin < medium < thick
    expect(STROKE_WIDTHS.thin).toBeLessThan(STROKE_WIDTHS.medium);
    expect(STROKE_WIDTHS.medium).toBeLessThan(STROKE_WIDTHS.thick);
  });
});
