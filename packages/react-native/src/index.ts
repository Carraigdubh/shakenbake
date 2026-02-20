// ---------------------------------------------------------------------------
// @shakenbake/react-native — Public API
// Expo SDK (shake trigger, view-shot capture, device context collection,
// Skia annotation canvas, report form, provider)
// ---------------------------------------------------------------------------

// ---- Plugins ----
export { ShakeTrigger } from './triggers/shake.js';
export { ViewShotCapture } from './capture/screenshot.js';
export { DeviceContextCollector } from './context/collectors.js';

// ---- Provider & Hook ----
export { ShakeNbakeProvider, ShakeNbakeContext } from './ShakeNbakeProvider.js';
export type { ShakeNbakeProviderProps } from './ShakeNbakeProvider.js';
export { useShakeNbake } from './hooks/useShakeNbake.js';
export type { UseShakeNbakeResult } from './hooks/useShakeNbake.js';

// ---- Report Form ----
export { ReportForm } from './ui/ReportForm.js';
export type { ReportFormProps } from './ui/ReportForm.js';

// ---- Form Validation (pure functions) ----
export {
  validateTitle,
  validateForm,
  isFormValid,
} from './ui/form-validation.js';
export type { FieldError } from './ui/form-validation.js';

// ---- State Machine (pure functions) ----
export {
  createFlowState,
  flowReducer,
} from './ui/state-machine.js';
export type {
  FlowStep,
  FlowData,
  FlowState,
  FlowAction,
} from './ui/state-machine.js';

// ---- Annotation ----
export { DrawingCanvas } from './annotate/DrawingCanvas.js';
export {
  useDrawingOperations,
  createDrawingState,
  addOperation,
  undoOperation,
  redoOperation,
  clearOperations,
} from './annotate/useDrawingOperations.js';
export type {
  DrawingOperationsState,
  DrawingOperationsActions,
  DrawingState,
} from './annotate/useDrawingOperations.js';
export type {
  DrawingCanvasProps,
  DrawingOperation,
  DrawingTool,
  DrawingColor,
  StrokeSize,
  Point,
} from './annotate/types.js';
export {
  DRAWING_COLORS,
  DEFAULT_COLOR,
  STROKE_WIDTHS,
  DEFAULT_STROKE_SIZE,
} from './annotate/types.js';
