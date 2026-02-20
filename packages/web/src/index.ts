// ---------------------------------------------------------------------------
// @shakenbake/web — Public API
// Web SDK (keyboard/FAB trigger, html2canvas, Canvas annotation, MediaRecorder audio)
// ---------------------------------------------------------------------------

// Triggers
export { KeyboardTrigger } from './triggers/keyboard.js';
export { FABTrigger } from './triggers/fab.js';
export type { FABTriggerConfig } from './triggers/fab.js';

// Capture
export { Html2CanvasCapture } from './capture/screenshot.js';
export type { Html2CanvasCaptureOptions } from './capture/screenshot.js';

// Context
export { BrowserContextCollector } from './context/collectors.js';
export type { BrowserContextCollectorOptions } from './context/collectors.js';
export { ConsoleInterceptor } from './context/console-interceptor.js';
export type {
  ConsoleEntry,
  ConsoleInterceptorConfig,
} from './context/console-interceptor.js';

// Annotation
export { DrawingCanvas } from './annotate/DrawingCanvas.js';
export type {
  DrawingCanvasProps,
  DrawingOperation,
  DrawingTool,
} from './annotate/types.js';
export {
  PALETTE_COLORS,
  STROKE_WIDTHS,
  TOOL_LABELS,
} from './annotate/types.js';
export {
  compositeImage,
  renderOperation,
  renderAllOperations,
} from './annotate/renderer.js';

// Provider & Hook
export { ShakeNbakeProvider } from './ShakeNbakeProvider.js';
export type {
  ShakeNbakeProviderProps,
  ShakeNbakeContextValue,
  FlowStep,
} from './ShakeNbakeProvider.js';
export { ShakeNbakeContext } from './ShakeNbakeProvider.js';
export { useShakeNbake } from './hooks/useShakeNbake.js';
export type { UseShakeNbakeReturn } from './hooks/useShakeNbake.js';

// UI
export { ReportForm } from './ui/ReportForm.js';
export type { ReportFormProps } from './ui/ReportForm.js';

// Adapters
export { ProxyAdapter } from './adapters/proxy.js';
export type { ProxyAdapterConfig } from './adapters/proxy.js';
