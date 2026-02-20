// ---------------------------------------------------------------------------
// @shakenbake/react-native — Annotation types
// ---------------------------------------------------------------------------

/**
 * Available drawing tool types for the annotation canvas.
 */
export type DrawingTool = 'pen' | 'rectangle' | 'arrow' | 'circle' | 'eraser';

/**
 * Available stroke widths.
 */
export type StrokeSize = 'thin' | 'medium' | 'thick';

/**
 * Available drawing colors.
 */
export const DRAWING_COLORS = [
  '#FF0000', // red (default)
  '#FFFF00', // yellow
  '#0066FF', // blue
  '#00CC00', // green
  '#FFFFFF', // white
  '#000000', // black
] as const;

export type DrawingColor = (typeof DRAWING_COLORS)[number];

/**
 * Default drawing color (red).
 */
export const DEFAULT_COLOR: DrawingColor = '#FF0000';

/**
 * Maps stroke size names to pixel values.
 */
export const STROKE_WIDTHS: Record<StrokeSize, number> = {
  thin: 2,
  medium: 4,
  thick: 8,
} as const;

/**
 * Default stroke size.
 */
export const DEFAULT_STROKE_SIZE: StrokeSize = 'medium';

/**
 * A 2D point on the canvas.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a single drawing operation on the annotation canvas.
 *
 * For 'pen' and 'eraser' tools, `points` contains the freehand path points.
 * For 'rectangle', 'arrow', and 'circle' tools, `startPoint` and `endPoint`
 * define the shape bounds.
 */
export interface DrawingOperation {
  /** Unique id for this operation (monotonically increasing). */
  id: number;
  /** Which tool created this operation. */
  tool: DrawingTool;
  /** Freehand path points (pen, eraser). */
  points?: Point[];
  /** Stroke/outline color. */
  color: string;
  /** Stroke width in pixels. */
  strokeWidth: number;
  /** Start point for shape tools. */
  startPoint?: Point;
  /** End point for shape tools. */
  endPoint?: Point;
}

/**
 * Props for the DrawingCanvas component.
 */
export interface DrawingCanvasProps {
  /** Base64-encoded screenshot to annotate. */
  screenshot: string;
  /** Dimensions of the canvas area. */
  dimensions: { width: number; height: number };
  /** Called when annotation is complete. Receives annotated and original base64 images. */
  onDone: (annotatedBase64: string, originalBase64: string) => void;
  /** Called when user cancels annotation. */
  onCancel: () => void;
}
