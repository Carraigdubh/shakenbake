// ---------------------------------------------------------------------------
// @shakenbake/web — Canvas Drawing Renderer
// Stateless functions that replay DrawingOperation[] onto a CanvasRenderingContext2D.
// ---------------------------------------------------------------------------

import type { DrawingOperation } from './types.js';

/**
 * Draw a single pen stroke (freehand path) onto the canvas context.
 */
function drawPenStroke(
  ctx: CanvasRenderingContext2D,
  op: DrawingOperation,
): void {
  const pts = op.points;
  if (!pts || pts.length === 0) return;

  ctx.strokeStyle = op.color;
  ctx.lineWidth = op.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);

  if (pts.length === 1) {
    // Single point — draw a small dot.
    ctx.lineTo(pts[0]!.x + 0.1, pts[0]!.y + 0.1);
  } else {
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }
  }

  ctx.stroke();
}

/**
 * Draw a rectangle outline.
 */
function drawRectangle(
  ctx: CanvasRenderingContext2D,
  op: DrawingOperation,
): void {
  if (!op.startPoint || !op.endPoint) return;

  ctx.strokeStyle = op.color;
  ctx.lineWidth = op.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const x = Math.min(op.startPoint.x, op.endPoint.x);
  const y = Math.min(op.startPoint.y, op.endPoint.y);
  const w = Math.abs(op.endPoint.x - op.startPoint.x);
  const h = Math.abs(op.endPoint.y - op.startPoint.y);

  ctx.strokeRect(x, y, w, h);
}

/**
 * Draw an arrow from startPoint to endPoint (line with arrowhead).
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  op: DrawingOperation,
): void {
  if (!op.startPoint || !op.endPoint) return;

  ctx.strokeStyle = op.color;
  ctx.fillStyle = op.color;
  ctx.lineWidth = op.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { x: x1, y: y1 } = op.startPoint;
  const { x: x2, y: y2 } = op.endPoint;

  // Draw the line.
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Draw arrowhead.
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = Math.max(op.strokeWidth * 4, 12);

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a circle/ellipse from center (startPoint) outward to endPoint.
 */
function drawCircle(
  ctx: CanvasRenderingContext2D,
  op: DrawingOperation,
): void {
  if (!op.startPoint || !op.endPoint) return;

  ctx.strokeStyle = op.color;
  ctx.lineWidth = op.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = op.startPoint.x;
  const cy = op.startPoint.y;
  const rx = Math.abs(op.endPoint.x - cx);
  const ry = Math.abs(op.endPoint.y - cy);

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Render a single DrawingOperation onto a 2D canvas context.
 */
export function renderOperation(
  ctx: CanvasRenderingContext2D,
  op: DrawingOperation,
): void {
  switch (op.tool) {
    case 'pen':
      drawPenStroke(ctx, op);
      break;
    case 'rectangle':
      drawRectangle(ctx, op);
      break;
    case 'arrow':
      drawArrow(ctx, op);
      break;
    case 'circle':
      drawCircle(ctx, op);
      break;
    case 'eraser':
      // Eraser is handled at the operations-array level (undo), not drawn.
      break;
  }
}

/**
 * Replay all drawing operations onto a 2D canvas context.
 * Caller is responsible for clearing and drawing the background image first.
 */
export function renderAllOperations(
  ctx: CanvasRenderingContext2D,
  operations: DrawingOperation[],
): void {
  for (const op of operations) {
    renderOperation(ctx, op);
  }
}

/**
 * Load a base64 image string into an HTMLImageElement.
 * Returns a Promise that resolves once the image is fully decoded.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load screenshot image'));
    img.src = src;
  });
}

/**
 * Composite the screenshot with all drawing operations into a single base64 PNG.
 * Creates an off-screen canvas at the original screenshot dimensions.
 */
export async function compositeImage(
  screenshot: string,
  dimensions: { width: number; height: number },
  operations: DrawingOperation[],
): Promise<string> {
  const img = await loadImage(screenshot);

  const offscreen = document.createElement('canvas');
  offscreen.width = dimensions.width;
  offscreen.height = dimensions.height;

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to obtain 2D context for compositing');
  }

  // Draw the screenshot background.
  ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

  // Replay all drawing operations on top.
  renderAllOperations(ctx, operations);

  return offscreen.toDataURL('image/png');
}
