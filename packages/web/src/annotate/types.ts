// ---------------------------------------------------------------------------
// @shakenbake/web — Annotation Canvas Types
// ---------------------------------------------------------------------------

/** Available drawing tool types. */
export type DrawingTool = 'pen' | 'rectangle' | 'arrow' | 'circle' | 'eraser';

/** A single recorded drawing operation (pen stroke or shape). */
export interface DrawingOperation {
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
  /** Points array — used for pen tool freehand paths. */
  points?: Array<{ x: number; y: number }>;
  /** Start point — used for rectangle, arrow, and circle tools. */
  startPoint?: { x: number; y: number };
  /** End point — used for rectangle, arrow, and circle tools. */
  endPoint?: { x: number; y: number };
}

/** Props for the DrawingCanvas React component. */
export interface DrawingCanvasProps {
  /** Base64-encoded screenshot image (data URL). */
  screenshot: string;
  /** Original screenshot dimensions (width x height in pixels). */
  dimensions: { width: number; height: number };
  /** Called when the user finishes annotation. Receives annotated and original base64 strings. */
  onDone: (annotatedBase64: string, originalBase64: string) => void;
  /** Called when the user cancels annotation. */
  onCancel: () => void;
  /** UI colour theme. Defaults to 'dark'. */
  theme?: 'light' | 'dark';
  /** Custom accent colour for toolbar highlights. */
  accentColor?: string;
}

/** Preset colour options for the annotation palette. */
export const PALETTE_COLORS = [
  '#FF0000', // red (default)
  '#FFDD00', // yellow
  '#2196F3', // blue
  '#4CAF50', // green
  '#FFFFFF', // white
  '#000000', // black
] as const;

/** Stroke width presets. */
export const STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
] as const;

/** Human-readable labels for drawing tools. */
export const TOOL_LABELS: Record<DrawingTool, string> = {
  pen: 'Pen',
  rectangle: 'Rectangle',
  arrow: 'Arrow',
  circle: 'Circle',
  eraser: 'Eraser',
} as const;
