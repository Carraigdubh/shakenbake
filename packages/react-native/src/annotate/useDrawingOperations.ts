// ---------------------------------------------------------------------------
// @shakenbake/react-native — Drawing operations state manager
//
// Pure business logic for managing the undo/redo stack and current tool state.
// This is extracted from the DrawingCanvas component so it can be tested
// independently without any Skia or React Native dependencies.
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef } from 'react';
import type {
  DrawingOperation,
  DrawingTool,
  DrawingColor,
  StrokeSize,
  Point,
} from './types.js';
import {
  DEFAULT_COLOR,
  DEFAULT_STROKE_SIZE,
  STROKE_WIDTHS,
} from './types.js';

/**
 * State returned by useDrawingOperations.
 */
export interface DrawingOperationsState {
  /** All completed drawing operations (the undo stack). */
  operations: DrawingOperation[];
  /** The current in-progress operation (while user is actively drawing). */
  currentOperation: DrawingOperation | null;
  /** The currently selected drawing tool. */
  tool: DrawingTool;
  /** The currently selected color. */
  color: DrawingColor;
  /** The currently selected stroke size name. */
  strokeSize: StrokeSize;
  /** The resolved stroke width in pixels. */
  strokeWidth: number;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
}

/**
 * Actions returned by useDrawingOperations.
 */
export interface DrawingOperationsActions {
  /** Select a drawing tool. Clears redo stack if switching tools. */
  setTool: (tool: DrawingTool) => void;
  /** Select a color. */
  setColor: (color: DrawingColor) => void;
  /** Select a stroke size. */
  setStrokeSize: (size: StrokeSize) => void;
  /** Begin a new drawing operation at the given point. */
  startOperation: (point: Point) => void;
  /** Continue the current operation to the given point. */
  continueOperation: (point: Point) => void;
  /** Complete the current operation. */
  endOperation: () => void;
  /** Undo the last operation. */
  undo: () => void;
  /** Redo the last undone operation. */
  redo: () => void;
  /** Clear all operations. */
  clearAll: () => void;
}

/**
 * React hook that manages drawing operations with undo/redo support.
 *
 * This hook is pure state management and contains no Skia or platform
 * dependencies, making it easy to test in a Node environment.
 */
export function useDrawingOperations(): [
  DrawingOperationsState,
  DrawingOperationsActions,
] {
  const [operations, setOperations] = useState<DrawingOperation[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingOperation[]>([]);
  const [currentOperation, setCurrentOperation] =
    useState<DrawingOperation | null>(null);
  const [tool, setToolState] = useState<DrawingTool>('pen');
  const [color, setColorState] = useState<DrawingColor>(DEFAULT_COLOR);
  const [strokeSize, setStrokeSizeState] =
    useState<StrokeSize>(DEFAULT_STROKE_SIZE);

  const nextIdRef = useRef(1);

  const strokeWidth = STROKE_WIDTHS[strokeSize];

  // ---- Tool / Color / Size setters ----

  const setTool = useCallback((newTool: DrawingTool) => {
    setToolState(newTool);
  }, []);

  const setColor = useCallback((newColor: DrawingColor) => {
    setColorState(newColor);
  }, []);

  const setStrokeSize = useCallback((size: StrokeSize) => {
    setStrokeSizeState(size);
  }, []);

  // ---- Operation lifecycle ----

  const startOperation = useCallback(
    (point: Point) => {
      const op: DrawingOperation = {
        id: nextIdRef.current++,
        tool,
        color,
        strokeWidth,
        ...(tool === 'pen' || tool === 'eraser'
          ? { points: [point] }
          : { startPoint: point, endPoint: point }),
      };
      setCurrentOperation(op);
    },
    [tool, color, strokeWidth],
  );

  const continueOperation = useCallback(
    (point: Point) => {
      setCurrentOperation((prev) => {
        if (!prev) return prev;
        if (prev.tool === 'pen' || prev.tool === 'eraser') {
          return { ...prev, points: [...(prev.points ?? []), point] };
        }
        // Shape tools: update endPoint
        return { ...prev, endPoint: point };
      });
    },
    [],
  );

  const endOperation = useCallback(() => {
    setCurrentOperation((prev) => {
      if (prev) {
        setOperations((ops) => [...ops, prev]);
        // Completing a new operation clears the redo stack
        setRedoStack([]);
      }
      return null;
    });
  }, []);

  // ---- Undo / Redo ----

  const undo = useCallback(() => {
    setOperations((ops) => {
      if (ops.length === 0) return ops;
      const last = ops[ops.length - 1]!;
      setRedoStack((redo) => [...redo, last]);
      return ops.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((redoOps) => {
      if (redoOps.length === 0) return redoOps;
      const last = redoOps[redoOps.length - 1]!;
      setOperations((ops) => [...ops, last]);
      return redoOps.slice(0, -1);
    });
  }, []);

  const clearAll = useCallback(() => {
    setOperations([]);
    setRedoStack([]);
    setCurrentOperation(null);
  }, []);

  // ---- Return ----

  const state: DrawingOperationsState = {
    operations,
    currentOperation,
    tool,
    color,
    strokeSize,
    strokeWidth,
    canUndo: operations.length > 0,
    canRedo: redoStack.length > 0,
  };

  const actions: DrawingOperationsActions = {
    setTool,
    setColor,
    setStrokeSize,
    startOperation,
    continueOperation,
    endOperation,
    undo,
    redo,
    clearAll,
  };

  return [state, actions];
}

// ---------------------------------------------------------------------------
// Pure-function equivalents for testing without React hooks
// ---------------------------------------------------------------------------

/**
 * Non-React state container for drawing operations.
 * Useful for unit testing the undo/redo logic without needing React.
 */
export interface DrawingState {
  operations: DrawingOperation[];
  redoStack: DrawingOperation[];
  currentOperation: DrawingOperation | null;
  nextId: number;
}

/**
 * Creates an empty drawing state.
 */
export function createDrawingState(): DrawingState {
  return {
    operations: [],
    redoStack: [],
    currentOperation: null,
    nextId: 1,
  };
}

/**
 * Adds a completed operation to the state and clears redo stack.
 */
export function addOperation(
  state: DrawingState,
  operation: Omit<DrawingOperation, 'id'>,
): DrawingState {
  return {
    ...state,
    operations: [...state.operations, { ...operation, id: state.nextId }],
    redoStack: [],
    nextId: state.nextId + 1,
  };
}

/**
 * Undoes the last operation: pops from operations, pushes to redoStack.
 * Returns unchanged state if nothing to undo.
 */
export function undoOperation(state: DrawingState): DrawingState {
  if (state.operations.length === 0) return state;
  const last = state.operations[state.operations.length - 1]!;
  return {
    ...state,
    operations: state.operations.slice(0, -1),
    redoStack: [...state.redoStack, last],
  };
}

/**
 * Redoes the last undone operation: pops from redoStack, pushes to operations.
 * Returns unchanged state if nothing to redo.
 */
export function redoOperation(state: DrawingState): DrawingState {
  if (state.redoStack.length === 0) return state;
  const last = state.redoStack[state.redoStack.length - 1]!;
  return {
    ...state,
    operations: [...state.operations, last],
    redoStack: state.redoStack.slice(0, -1),
  };
}

/**
 * Clears all operations and redo history.
 */
export function clearOperations(state: DrawingState): DrawingState {
  return {
    ...state,
    operations: [],
    redoStack: [],
    currentOperation: null,
  };
}
