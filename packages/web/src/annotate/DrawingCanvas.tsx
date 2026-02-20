// ---------------------------------------------------------------------------
// @shakenbake/web — DrawingCanvas
// Full-screen annotation overlay with freehand pen, shape tools, and compositing.
// ---------------------------------------------------------------------------

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, TouchEvent } from 'react';
import type {
  DrawingCanvasProps,
  DrawingOperation,
  DrawingTool,
} from './types.js';
import {
  PALETTE_COLORS,
  STROKE_WIDTHS,
  TOOL_LABELS,
} from './types.js';
import {
  compositeImage,
  loadImage,
  renderAllOperations,
  renderOperation,
} from './renderer.js';

// ---------------------------------------------------------------------------
// Inline styles (no external CSS dependency)
// ---------------------------------------------------------------------------

function getOverlayStyle(theme: 'light' | 'dark'): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f0f0f0',
    color: theme === 'dark' ? '#ffffff' : '#1a1a1a',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };
}

function getToolbarStyle(theme: 'light' | 'dark'): CSSProperties {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0',
    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #ccc',
    userSelect: 'none',
    flexShrink: 0,
  };
}

function getCanvasContainerStyle(): CSSProperties {
  return {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };
}

function getButtonStyle(
  theme: 'light' | 'dark',
  active: boolean,
  accentColor: string,
): CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: '4px',
    border: active ? `2px solid ${accentColor}` : '2px solid transparent',
    backgroundColor: active
      ? theme === 'dark'
        ? '#444'
        : '#ccc'
      : theme === 'dark'
        ? '#333'
        : '#ddd',
    color: theme === 'dark' ? '#fff' : '#1a1a1a',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    lineHeight: '1.4',
    outline: 'none',
  };
}

function getColorSwatchStyle(
  color: string,
  selected: boolean,
  accentColor: string,
): CSSProperties {
  return {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: color,
    border: selected
      ? `3px solid ${accentColor}`
      : '2px solid rgba(128,128,128,0.5)',
    cursor: 'pointer',
    outline: 'none',
    flexShrink: 0,
  };
}

function getActionButtonStyle(
  variant: 'primary' | 'secondary',
  theme: 'light' | 'dark',
  accentColor: string,
): CSSProperties {
  if (variant === 'primary') {
    return {
      padding: '6px 16px',
      borderRadius: '4px',
      border: 'none',
      backgroundColor: accentColor,
      color: '#ffffff',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      outline: 'none',
    };
  }
  return {
    padding: '6px 16px',
    borderRadius: '4px',
    border: theme === 'dark' ? '1px solid #555' : '1px solid #bbb',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#fff' : '#1a1a1a',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 400,
    outline: 'none',
  };
}

function getSeparatorStyle(theme: 'light' | 'dark'): CSSProperties {
  return {
    width: '1px',
    height: '28px',
    backgroundColor: theme === 'dark' ? '#555' : '#bbb',
    flexShrink: 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AVAILABLE_TOOLS: DrawingTool[] = [
  'pen',
  'rectangle',
  'arrow',
  'circle',
];

export function DrawingCanvas({
  screenshot,
  dimensions,
  onDone,
  onCancel,
  theme = 'dark',
  accentColor = '#FF4081',
}: DrawingCanvasProps): React.JSX.Element {
  // -- State --
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [activeColor, setActiveColor] = useState<string>(PALETTE_COLORS[0]);
  const [activeStroke, setActiveStroke] = useState<number>(STROKE_WIDTHS[1].value);
  const [operations, setOperations] = useState<DrawingOperation[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingOperation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // -- Refs --
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const currentOpRef = useRef<DrawingOperation | null>(null);

  // -- Load background image --
  useEffect(() => {
    let cancelled = false;
    loadImage(screenshot)
      .then((img) => {
        if (!cancelled) {
          bgImageRef.current = img;
          redrawCanvas(operations);
        }
      })
      .catch(() => {
        // Image load failed — canvas will show empty background.
      });
    return () => {
      cancelled = true;
    };
    // We intentionally only run on mount / screenshot change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenshot, dimensions]);

  // -- Redraw whenever operations change --
  useEffect(() => {
    redrawCanvas(operations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations]);

  // -----------------------------------------------------------------------
  // Canvas redraw
  // -----------------------------------------------------------------------
  const redrawCanvas = useCallback(
    (ops: DrawingOperation[], preview?: DrawingOperation) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear.
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw background.
      if (bgImageRef.current) {
        ctx.drawImage(
          bgImageRef.current,
          0,
          0,
          dimensions.width,
          dimensions.height,
        );
      }

      // Replay committed operations.
      renderAllOperations(ctx, ops);

      // Draw in-progress shape preview.
      if (preview) {
        renderOperation(ctx, preview);
      }
    },
    [dimensions],
  );

  // -----------------------------------------------------------------------
  // Coordinate helpers (account for any CSS scaling)
  // -----------------------------------------------------------------------
  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = dimensions.width / rect.width;
      const scaleY = dimensions.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [dimensions],
  );

  // -----------------------------------------------------------------------
  // Pointer down
  // -----------------------------------------------------------------------
  const handlePointerDown = useCallback(
    (clientX: number, clientY: number) => {
      const pt = getCanvasPoint(clientX, clientY);
      setIsDrawing(true);

      if (activeTool === 'pen') {
        currentOpRef.current = {
          tool: 'pen',
          color: activeColor,
          strokeWidth: activeStroke,
          points: [pt],
        };
      } else {
        // Shape tools — record start point.
        currentOpRef.current = {
          tool: activeTool,
          color: activeColor,
          strokeWidth: activeStroke,
          startPoint: pt,
          endPoint: pt,
        };
      }
    },
    [activeTool, activeColor, activeStroke, getCanvasPoint],
  );

  // -----------------------------------------------------------------------
  // Pointer move
  // -----------------------------------------------------------------------
  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing || !currentOpRef.current) return;
      const pt = getCanvasPoint(clientX, clientY);

      if (currentOpRef.current.tool === 'pen') {
        currentOpRef.current.points!.push(pt);
        // For pen tool, draw incrementally for performance.
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const pts = currentOpRef.current.points!;
            if (pts.length >= 2) {
              ctx.strokeStyle = currentOpRef.current.color;
              ctx.lineWidth = currentOpRef.current.strokeWidth;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(pts[pts.length - 2]!.x, pts[pts.length - 2]!.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.stroke();
            }
          }
        }
      } else {
        // Shape tools — update end point and re-render preview.
        currentOpRef.current = { ...currentOpRef.current, endPoint: pt };
        redrawCanvas(operations, currentOpRef.current);
      }
    },
    [isDrawing, getCanvasPoint, operations, redrawCanvas],
  );

  // -----------------------------------------------------------------------
  // Pointer up
  // -----------------------------------------------------------------------
  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentOpRef.current) {
      setIsDrawing(false);
      return;
    }

    const op = currentOpRef.current;
    currentOpRef.current = null;
    setIsDrawing(false);

    // Only commit non-trivial operations.
    if (op.tool === 'pen' && (!op.points || op.points.length === 0)) return;
    if (
      op.tool !== 'pen' &&
      op.startPoint &&
      op.endPoint &&
      op.startPoint.x === op.endPoint.x &&
      op.startPoint.y === op.endPoint.y
    ) {
      return;
    }

    setOperations((prev) => [...prev, op]);
    setRedoStack([]); // Clear redo stack on new operation.
  }, [isDrawing]);

  // -----------------------------------------------------------------------
  // Mouse event handlers
  // -----------------------------------------------------------------------
  const onMouseDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      handlePointerDown(e.clientX, e.clientY);
    },
    [handlePointerDown],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      handlePointerMove(e.clientX, e.clientY);
    },
    [handlePointerMove],
  );

  const onMouseUp = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  // -----------------------------------------------------------------------
  // Touch event handlers
  // -----------------------------------------------------------------------
  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) handlePointerDown(touch.clientX, touch.clientY);
    },
    [handlePointerDown],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) handlePointerMove(touch.clientX, touch.clientY);
    },
    [handlePointerMove],
  );

  const onTouchEnd = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------
  const handleUndo = useCallback(() => {
    setOperations((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      setRedoStack((stack) => [...stack, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1]!;
      setOperations((prev) => [...prev, last]);
      return stack.slice(0, -1);
    });
  }, []);

  // -----------------------------------------------------------------------
  // Done / Cancel
  // -----------------------------------------------------------------------
  const handleDone = useCallback(async () => {
    try {
      const annotated = await compositeImage(screenshot, dimensions, operations);
      onDone(annotated, screenshot);
    } catch {
      // Fallback: if compositing fails, return the original for both.
      onDone(screenshot, screenshot);
    }
  }, [screenshot, dimensions, operations, onDone]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div style={getOverlayStyle(theme)} data-testid="drawing-canvas-overlay">
      {/* Toolbar */}
      <div style={getToolbarStyle(theme)} data-testid="drawing-canvas-toolbar">
        {/* Tool selectors */}
        {AVAILABLE_TOOLS.map((tool) => (
          <button
            key={tool}
            type="button"
            style={getButtonStyle(theme, activeTool === tool, accentColor)}
            onClick={() => setActiveTool(tool)}
            aria-label={`Select ${TOOL_LABELS[tool]} tool`}
            aria-pressed={activeTool === tool}
            data-testid={`tool-${tool}`}
          >
            {TOOL_LABELS[tool]}
          </button>
        ))}

        <div style={getSeparatorStyle(theme)} role="separator" />

        {/* Color palette */}
        {PALETTE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            style={getColorSwatchStyle(color, activeColor === color, accentColor)}
            onClick={() => setActiveColor(color)}
            aria-label={`Select colour ${color}`}
            aria-pressed={activeColor === color}
            data-testid={`color-${color}`}
          />
        ))}

        <div style={getSeparatorStyle(theme)} role="separator" />

        {/* Stroke width */}
        {STROKE_WIDTHS.map((sw) => (
          <button
            key={sw.value}
            type="button"
            style={getButtonStyle(theme, activeStroke === sw.value, accentColor)}
            onClick={() => setActiveStroke(sw.value)}
            aria-label={`${sw.label} stroke width`}
            aria-pressed={activeStroke === sw.value}
            data-testid={`stroke-${sw.value}`}
          >
            {sw.label}
          </button>
        ))}

        <div style={getSeparatorStyle(theme)} role="separator" />

        {/* Undo / Redo */}
        <button
          type="button"
          style={getButtonStyle(theme, false, accentColor)}
          onClick={handleUndo}
          disabled={operations.length === 0}
          aria-label="Undo"
          data-testid="btn-undo"
        >
          Undo
        </button>
        <button
          type="button"
          style={getButtonStyle(theme, false, accentColor)}
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          aria-label="Redo"
          data-testid="btn-redo"
        >
          Redo
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Cancel / Done */}
        <button
          type="button"
          style={getActionButtonStyle('secondary', theme, accentColor)}
          onClick={handleCancel}
          aria-label="Cancel annotation"
          data-testid="btn-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          style={getActionButtonStyle('primary', theme, accentColor)}
          onClick={handleDone}
          aria-label="Finish annotation"
          data-testid="btn-done"
        >
          Done
        </button>
      </div>

      {/* Canvas area */}
      <div style={getCanvasContainerStyle()}>
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            cursor: 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          data-testid="drawing-canvas"
        />
      </div>
    </div>
  );
}
