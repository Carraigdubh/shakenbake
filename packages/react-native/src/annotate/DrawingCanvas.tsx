// ---------------------------------------------------------------------------
// @shakenbake/react-native — DrawingCanvas (Skia annotation overlay)
//
// A full-screen annotation component that renders a captured screenshot as the
// background and lets the user draw freehand paths, rectangles, arrows, and
// circles on top of it.  Uses @shopify/react-native-skia for GPU-accelerated
// 60fps drawing.
//
// Since @shopify/react-native-skia is a **peer dependency**, the component
// handles the case where Skia is not installed: it renders a helpful error
// message rather than crashing.
// ---------------------------------------------------------------------------

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';

import type { DrawingCanvasProps, DrawingOperation, Point } from './types.js';
import { DRAWING_COLORS, STROKE_WIDTHS } from './types.js';
import type { DrawingColor, StrokeSize, DrawingTool } from './types.js';
import {
  useDrawingOperations,
} from './useDrawingOperations.js';

// ---------------------------------------------------------------------------
// Skia module types — kept local so the file compiles without Skia installed.
// The actual module is loaded dynamically at runtime.
// ---------------------------------------------------------------------------

/** Minimal Skia module shape we need at runtime. */
interface SkiaModule {
  Canvas: React.ComponentType<Record<string, unknown>>;
  Image: React.ComponentType<Record<string, unknown>>;
  Path: React.ComponentType<Record<string, unknown>>;
  Rect: React.ComponentType<Record<string, unknown>>;
  Circle: React.ComponentType<Record<string, unknown>>;
  Line: React.ComponentType<Record<string, unknown>>;
  Skia: {
    Path: { Make(): SkiaPath };
    Data: { fromBase64(b64: string): SkiaData };
  };
  makeImageFromEncoded: (data: SkiaData) => SkiaImage | null;
  useCanvasRef: () => { current: SkiaCanvasRef | null };
}

interface SkiaPath {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  close(): void;
  reset(): void;
  copy(): SkiaPath;
}

interface SkiaData {
  dispose(): void;
}

interface SkiaImage {
  width(): number;
  height(): number;
  encodeToBase64(format?: string, quality?: number): string;
}

interface SkiaCanvasRef {
  makeImageSnapshot(): SkiaImage;
  makeImageSnapshotAsync?: () => Promise<SkiaImage>;
}

// ---------------------------------------------------------------------------
// React Native component types (peer dep — loaded dynamically)
// ---------------------------------------------------------------------------

interface RNModule {
  View: React.ComponentType<Record<string, unknown>>;
  Text: React.ComponentType<Record<string, unknown>>;
  TouchableOpacity: React.ComponentType<Record<string, unknown>>;
  StyleSheet: {
    create<T extends Record<string, Record<string, unknown>>>(styles: T): T;
  };
  PanResponder: {
    create(config: Record<string, unknown>): {
      panHandlers: Record<string, unknown>;
    };
  };
}

// ---------------------------------------------------------------------------
// Arrow head helper
// ---------------------------------------------------------------------------

function buildArrowHeadPath(
  skia: SkiaModule['Skia'],
  from: Point,
  to: Point,
  headLength: number,
): SkiaPath {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headAngle = Math.PI / 6; // 30 degrees

  const p1x = to.x - headLength * Math.cos(angle - headAngle);
  const p1y = to.y - headLength * Math.sin(angle - headAngle);
  const p2x = to.x - headLength * Math.cos(angle + headAngle);
  const p2y = to.y - headLength * Math.sin(angle + headAngle);

  const path = skia.Path.Make();
  path.moveTo(to.x, to.y);
  path.lineTo(p1x, p1y);
  path.moveTo(to.x, to.y);
  path.lineTo(p2x, p2y);
  return path;
}

// ---------------------------------------------------------------------------
// Build an SkPath from freehand points
// ---------------------------------------------------------------------------

function buildFreehandPath(
  skia: SkiaModule['Skia'],
  points: Point[],
): SkiaPath {
  const path = skia.Path.Make();
  if (points.length === 0) return path;
  const first = points[0]!;
  path.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const pt = points[i]!;
    path.lineTo(pt.x, pt.y);
  }
  return path;
}

// ---------------------------------------------------------------------------
// Toolbar sub-component (pure React Native — no Skia)
// ---------------------------------------------------------------------------

interface ToolbarProps {
  rn: RNModule;
  tool: DrawingTool;
  color: DrawingColor;
  strokeSize: StrokeSize;
  canUndo: boolean;
  canRedo: boolean;
  onSetTool: (tool: DrawingTool) => void;
  onSetColor: (color: DrawingColor) => void;
  onSetStrokeSize: (size: StrokeSize) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
  onCancel: () => void;
}

const TOOL_LABELS: Record<DrawingTool, string> = {
  pen: 'Pen',
  rectangle: 'Rect',
  arrow: 'Arrow',
  circle: 'Circle',
  eraser: 'Eraser',
};

const TOOLS: DrawingTool[] = ['pen', 'rectangle', 'arrow', 'circle', 'eraser'];
const SIZES: StrokeSize[] = ['thin', 'medium', 'thick'];

function Toolbar({
  rn,
  tool,
  color,
  strokeSize,
  canUndo,
  canRedo,
  onSetTool,
  onSetColor,
  onSetStrokeSize,
  onUndo,
  onRedo,
  onDone,
  onCancel,
}: ToolbarProps): React.ReactNode {
  const { View, Text, TouchableOpacity, StyleSheet } = rn;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          paddingBottom: 34, // safe area
          paddingTop: 8,
          paddingHorizontal: 12,
        },
        row: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          marginVertical: 4,
          flexWrap: 'wrap' as const,
          gap: 6,
        },
        button: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.15)',
          marginHorizontal: 2,
        },
        buttonActive: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.4)',
          marginHorizontal: 2,
        },
        buttonDisabled: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.05)',
          marginHorizontal: 2,
          opacity: 0.4,
        },
        buttonText: {
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: '600' as const,
        },
        colorSwatch: {
          width: 28,
          height: 28,
          borderRadius: 14,
          marginHorizontal: 3,
          borderWidth: 2,
          borderColor: 'transparent',
        },
        colorSwatchActive: {
          width: 28,
          height: 28,
          borderRadius: 14,
          marginHorizontal: 3,
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
        actionRow: {
          flexDirection: 'row' as const,
          justifyContent: 'space-between' as const,
          alignItems: 'center' as const,
          marginTop: 4,
          paddingHorizontal: 4,
        },
        cancelButton: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 6,
          backgroundColor: 'rgba(255,60,60,0.3)',
        },
        doneButton: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 6,
          backgroundColor: 'rgba(60,180,60,0.5)',
        },
      }),
    [StyleSheet],
  );

  return React.createElement(
    View,
    { style: styles.container, pointerEvents: 'auto' },
    // Row 1: Tool selection
    React.createElement(
      View,
      { style: styles.row },
      ...TOOLS.map((t) =>
        React.createElement(
          TouchableOpacity,
          {
            key: t,
            style: t === tool ? styles.buttonActive : styles.button,
            onPress: () => onSetTool(t),
          },
          React.createElement(Text, { style: styles.buttonText }, TOOL_LABELS[t]),
        ),
      ),
      // Undo / Redo
      React.createElement(
        TouchableOpacity,
        {
          key: 'undo',
          style: canUndo ? styles.button : styles.buttonDisabled,
          onPress: onUndo,
          disabled: !canUndo,
        },
        React.createElement(Text, { style: styles.buttonText }, 'Undo'),
      ),
      React.createElement(
        TouchableOpacity,
        {
          key: 'redo',
          style: canRedo ? styles.button : styles.buttonDisabled,
          onPress: onRedo,
          disabled: !canRedo,
        },
        React.createElement(Text, { style: styles.buttonText }, 'Redo'),
      ),
    ),
    // Row 2: Color palette
    React.createElement(
      View,
      { style: styles.row },
      ...DRAWING_COLORS.map((c) =>
        React.createElement(TouchableOpacity, {
          key: c,
          style: {
            ...(c === color ? styles.colorSwatchActive : styles.colorSwatch),
            backgroundColor: c,
          },
          onPress: () => onSetColor(c),
        }),
      ),
    ),
    // Row 3: Stroke size
    React.createElement(
      View,
      { style: styles.row },
      ...SIZES.map((s) =>
        React.createElement(
          TouchableOpacity,
          {
            key: s,
            style: s === strokeSize ? styles.buttonActive : styles.button,
            onPress: () => onSetStrokeSize(s),
          },
          React.createElement(
            Text,
            { style: styles.buttonText },
            `${s.charAt(0).toUpperCase()}${s.slice(1)} (${STROKE_WIDTHS[s]}px)`,
          ),
        ),
      ),
    ),
    // Row 4: Cancel / Done
    React.createElement(
      View,
      { style: styles.actionRow },
      React.createElement(
        TouchableOpacity,
        { style: styles.cancelButton, onPress: onCancel },
        React.createElement(Text, { style: styles.buttonText }, 'Cancel'),
      ),
      React.createElement(
        TouchableOpacity,
        { style: styles.doneButton, onPress: onDone },
        React.createElement(Text, { style: styles.buttonText }, 'Done'),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// DrawingCanvas — Main exported component
// ---------------------------------------------------------------------------

/**
 * Full-screen Skia annotation canvas.
 *
 * Renders the screenshot as background image, supports freehand pen drawing,
 * rectangle, arrow, circle, and eraser tools with undo/redo.
 *
 * Requires `@shopify/react-native-skia` to be installed in the host app.
 * If Skia is not available, a helpful fallback error message is shown.
 */
export function DrawingCanvas(props: DrawingCanvasProps): React.ReactNode {
  const { screenshot, dimensions, onDone, onCancel } = props;

  // ---- Module loading state ----
  const [skia, setSkia] = useState<SkiaModule | null>(null);
  const [rnMod, setRnMod] = useState<RNModule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<SkiaImage | null>(
    null,
  );

  // ---- Drawing state (pure logic) ----
  const [drawState, drawActions] = useDrawingOperations();

  // Canvas ref for snapshot export
  const canvasRefHolder = useRef<{ current: SkiaCanvasRef | null }>({
    current: null,
  });
  const surfaceRef = useRef<unknown>(null);

  // ---- Load peer dependencies at mount ----
  useEffect(() => {
    let cancelled = false;

    async function loadModules(): Promise<void> {
      try {
        const [skiaMod, rnModule] = await Promise.all([
          import('@shopify/react-native-skia') as Promise<unknown>,
          import('react-native') as Promise<unknown>,
        ]);
        if (cancelled) return;
        setSkia(skiaMod as SkiaModule);
        setRnMod(rnModule as RNModule);
      } catch {
        if (cancelled) return;
        setLoadError(
          '@shopify/react-native-skia is required for annotation but is not installed. ' +
            'Install it with: npx expo install @shopify/react-native-skia',
        );
      }
    }

    void loadModules();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Decode screenshot into Skia image ----
  useEffect(() => {
    if (!skia || !screenshot) return;
    try {
      // Strip data-uri prefix if present (e.g. "data:image/png;base64,...")
      const commaIndex = screenshot.indexOf(',');
      const rawBase64 = commaIndex >= 0 ? screenshot.substring(commaIndex + 1) : screenshot;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const skiaAny = skia as any;

      // Resolve fromBase64 — handle different Skia API shapes
      const fromBase64Fn: ((b64: string) => SkiaData) | undefined =
        skiaAny?.Skia?.Data?.fromBase64 ?? skiaAny?.Data?.fromBase64;

      if (typeof fromBase64Fn !== 'function') {
        throw new Error('Skia.Data.fromBase64 not available');
      }

      const data = fromBase64Fn(rawBase64);

      // Resolve makeImageFromEncoded — handle different Skia API shapes
      const decodeFn: ((d: SkiaData) => SkiaImage | null) | undefined =
        skiaAny?.makeImageFromEncoded ??
        skiaAny?.Skia?.Image?.MakeImageFromEncoded ??
        skiaAny?.Image?.MakeImageFromEncoded;

      if (typeof decodeFn !== 'function') {
        throw new Error('Skia image decode API not available');
      }

      const img = decodeFn(data);
      setBackgroundImage(img ?? null);
    } catch {
      // If decoding fails, we proceed without a background
      setBackgroundImage(null);
    }
  }, [skia, screenshot]);

  // ---- Initialize canvas ref via Skia hook ----
  // We cannot call hooks conditionally, so we track whether Skia loaded
  // and skip rendering if it hasn't.

  // ---- compositeImage: export canvas as base64 ----
  const compositeImage = useCallback(async (): Promise<string | null> => {
    const ref = canvasRefHolder.current.current;
    if (!ref) return null;
    try {
      if (typeof ref.makeImageSnapshotAsync === 'function') {
        const asyncSnapshot = await ref.makeImageSnapshotAsync();
        const asyncEncoded = asyncSnapshot?.encodeToBase64?.('png', 100);
        if (asyncEncoded) return asyncEncoded;
      }

      const snapshot = ref.makeImageSnapshot();
      return snapshot?.encodeToBase64?.('png', 100) ?? null;
    } catch {
      return null;
    }
  }, []);

  const captureSurfaceWithViewShot = useCallback(async (): Promise<string | null> => {
    if (!surfaceRef.current) return null;
    try {
      let mod: unknown;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require('react-native-view-shot');
      } catch {
        mod = await import('react-native-view-shot');
      }
      // Keep runtime resolution flexible across CJS/ESM export shapes.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modAny = mod as any;
      const captureRef =
        modAny?.captureRef ??
        modAny?.default?.captureRef ??
        (typeof modAny?.default === 'function' ? modAny.default : undefined);
      if (typeof captureRef !== 'function') return null;
      const raw = await captureRef(surfaceRef.current, {
        format: 'png',
        quality: 1,
        result: 'base64',
      });
      if (typeof raw !== 'string' || raw.length === 0) return null;
      const commaIndex = raw.indexOf(',');
      return commaIndex >= 0 ? raw.substring(commaIndex + 1) : raw;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ShakeNbake] DrawingCanvas: view-shot fallback failed', err);
      return null;
    }
  }, []);

  const captureSurfaceWithSkiaViewSnapshot = useCallback(async (): Promise<string | null> => {
    if (!surfaceRef.current || !skia) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const skiaAny = skia as any;
      const makeImageFromView: ((ref: unknown) => Promise<SkiaImage | null>) | undefined =
        skiaAny?.makeImageFromView;
      if (typeof makeImageFromView !== 'function') return null;

      const image = await makeImageFromView(surfaceRef);
      const encoded = image?.encodeToBase64?.('png', 100) ?? image?.encodeToBase64?.();
      return typeof encoded === 'string' && encoded.length > 0 ? encoded : null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ShakeNbake] DrawingCanvas: Skia view snapshot fallback failed', err);
      return null;
    }
  }, [skia]);

  const handleDone = useCallback(async () => {
    const hadDrawingBeforeFinalize =
      drawState.operations.length > 0 || Boolean(drawState.currentOperation);

    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const raf = (): Promise<void> =>
      new Promise((resolve) => {
        const r = globalThis.requestAnimationFrame;
        if (typeof r === 'function') {
          r(() => resolve());
          return;
        }
        setTimeout(resolve, 16);
      });

    await raf();
    await raf();

    let annotated: string | null = null;
    for (let i = 0; i < 6; i += 1) {
      await sleep(60 + i * 40);
      annotated = await compositeImage();
      if (annotated && (annotated !== screenshot || !hadDrawingBeforeFinalize)) {
        break;
      }
    }

    if (
      (!annotated || (annotated === screenshot && hadDrawingBeforeFinalize)) &&
      hadDrawingBeforeFinalize
    ) {
      for (let i = 0; i < 3; i += 1) {
        await sleep(80 + i * 40);
        annotated = await captureSurfaceWithSkiaViewSnapshot();
        if (annotated && annotated !== screenshot) {
          break;
        }
      }
    }

    if (
      (!annotated || (annotated === screenshot && hadDrawingBeforeFinalize)) &&
      hadDrawingBeforeFinalize
    ) {
      for (let i = 0; i < 4; i += 1) {
        await sleep(90 + i * 40);
        annotated = await captureSurfaceWithViewShot();
        if (annotated && annotated !== screenshot) {
          break;
        }
      }
    }

    if (annotated && annotated === screenshot && hadDrawingBeforeFinalize) {
      // eslint-disable-next-line no-console
      console.error('[ShakeNbake] DrawingCanvas: snapshot matched original despite drawing operations');
    }
    if (!annotated && hadDrawingBeforeFinalize) {
      // eslint-disable-next-line no-console
      console.error(
        '[ShakeNbake] DrawingCanvas: failed to export annotated snapshot, falling back to original',
      );
    }
    onDone(annotated ?? screenshot, screenshot);
  }, [
    captureSurfaceWithSkiaViewSnapshot,
    captureSurfaceWithViewShot,
    compositeImage,
    drawState.currentOperation,
    drawState.operations.length,
    onDone,
    screenshot,
  ]);

  // ---- PanResponder for touch drawing ----
  const drawActionsRef = useRef(drawActions);
  const [panHandlers, setPanHandlers] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    drawActionsRef.current = drawActions;
  }, [drawActions]);

  useEffect(() => {
    if (!rnMod) {
      setPanHandlers(null);
      return;
    }

    const responder = rnMod.PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (
        evt: { nativeEvent: { locationX: number; locationY: number } },
      ) => {
        drawActionsRef.current.startOperation({
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        });
      },
      onPanResponderMove: (
        evt: { nativeEvent: { locationX: number; locationY: number } },
      ) => {
        drawActionsRef.current.continueOperation({
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        });
      },
      onPanResponderRelease: () => {
        drawActionsRef.current.endOperation();
      },
    });
    setPanHandlers(responder.panHandlers as Record<string, unknown>);
  }, [rnMod]);

  // ---- Render: loading / error / canvas ----

  // Fallback if modules not loaded yet
  if (loadError) {
    // Cannot render React Native components since the module failed to load.
    // Call onCancel to dismiss and let the consumer handle the error.
    // eslint-disable-next-line no-console
    console.error('[ShakeNbake]', loadError);
    return null;
  }

  if (!skia || !rnMod) {
    // Still loading
    return null;
  }

  const {
    Canvas,
    Image: SkiaImageComponent,
    Path: SkiaPathComponent,
    Rect: SkiaRectComponent,
    Circle: SkiaCircleComponent,
    Line: SkiaLineComponent,
    Skia: SkiaStatic,
  } = skia;

  const { View } = rnMod;

  // ---- Render a single DrawingOperation as Skia elements ----
  function renderOperation(op: DrawingOperation): React.ReactNode {
    const key = `op-${op.id}`;
    switch (op.tool) {
      case 'pen':
      case 'eraser': {
        if (!op.points || op.points.length === 0) return null;
        const path = buildFreehandPath(SkiaStatic, op.points);
        return React.createElement(SkiaPathComponent, {
          key,
          path,
          color: op.tool === 'eraser' ? '#000000' : op.color,
          style: 'stroke',
          strokeWidth: op.tool === 'eraser' ? op.strokeWidth * 3 : op.strokeWidth,
          strokeCap: 'round',
          strokeJoin: 'round',
        });
      }
      case 'rectangle': {
        if (!op.startPoint || !op.endPoint) return null;
        const x = Math.min(op.startPoint.x, op.endPoint.x);
        const y = Math.min(op.startPoint.y, op.endPoint.y);
        const w = Math.abs(op.endPoint.x - op.startPoint.x);
        const h = Math.abs(op.endPoint.y - op.startPoint.y);
        return React.createElement(SkiaRectComponent, {
          key,
          x,
          y,
          width: w,
          height: h,
          color: op.color,
          style: 'stroke',
          strokeWidth: op.strokeWidth,
        });
      }
      case 'arrow': {
        if (!op.startPoint || !op.endPoint) return null;
        const headLen = Math.max(12, op.strokeWidth * 4);
        const arrowHead = buildArrowHeadPath(
          SkiaStatic,
          op.startPoint,
          op.endPoint,
          headLen,
        );
        return React.createElement(
          React.Fragment,
          { key },
          React.createElement(SkiaLineComponent, {
            p1: op.startPoint,
            p2: op.endPoint,
            color: op.color,
            style: 'stroke',
            strokeWidth: op.strokeWidth,
            strokeCap: 'round',
          }),
          React.createElement(SkiaPathComponent, {
            path: arrowHead,
            color: op.color,
            style: 'stroke',
            strokeWidth: op.strokeWidth,
            strokeCap: 'round',
          }),
        );
      }
      case 'circle': {
        if (!op.startPoint || !op.endPoint) return null;
        const cx = op.startPoint.x;
        const cy = op.startPoint.y;
        const r = Math.sqrt(
          (op.endPoint.x - cx) ** 2 + (op.endPoint.y - cy) ** 2,
        );
        return React.createElement(SkiaCircleComponent, {
          key,
          cx,
          cy,
          r,
          color: op.color,
          style: 'stroke',
          strokeWidth: op.strokeWidth,
        });
      }
      default:
        return null;
    }
  }

  // ---- All operations to render (completed + current in-progress) ----
  const allOperations = drawState.currentOperation
    ? [...drawState.operations, drawState.currentOperation]
    : drawState.operations;

  // ---- Component tree ----
  // We use React.createElement throughout because JSX for Skia/RN components
  // loaded dynamically would require more complex typing.

  return React.createElement(
    View,
    {
      style: {
        flex: 1,
        backgroundColor: '#000000',
      },
    },
    // Drawing surface with PanResponder
    React.createElement(
      View,
      {
        ref: surfaceRef as any,
        collapsable: false,
        style: {
          width: dimensions.width,
          height: dimensions.height,
        },
      },
      React.createElement(
        Canvas,
        {
          ref: (ref: SkiaCanvasRef | null) => {
            canvasRefHolder.current.current = ref;
          },
          style: {
            width: dimensions.width,
            height: dimensions.height,
          },
        },
        // Background screenshot
        backgroundImage
          ? React.createElement(SkiaImageComponent, {
              image: backgroundImage,
              x: 0,
              y: 0,
              width: dimensions.width,
              height: dimensions.height,
              fit: 'fill',
            })
          : null,
        // All drawing operations
        ...allOperations.map(renderOperation),
      ),
      React.createElement(View, {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
        },
        ...(panHandlers ?? {}),
      }),
    ),
    // Toolbar overlay
    React.createElement(Toolbar, {
      rn: rnMod,
      tool: drawState.tool,
      color: drawState.color,
      strokeSize: drawState.strokeSize,
      canUndo: drawState.canUndo,
      canRedo: drawState.canRedo,
      onSetTool: drawActions.setTool,
      onSetColor: drawActions.setColor,
      onSetStrokeSize: drawActions.setStrokeSize,
      onUndo: drawActions.undo,
      onRedo: drawActions.redo,
      onDone: handleDone,
      onCancel,
    }),
  );
}
