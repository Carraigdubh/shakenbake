// ---------------------------------------------------------------------------
// @shakenbake/react-native — ShakeNbake flow state machine
//
// Pure state machine logic for the bug-reporting flow. Extracted from the
// provider so it can be unit-tested without React or React Native.
// ---------------------------------------------------------------------------

import type { CaptureResult, SubmitResult, DeviceContext } from '@shakenbake/core';

/**
 * States in the bug-reporting flow.
 */
export type FlowStep =
  | 'idle'
  | 'triggered'
  | 'capturing'
  | 'annotating'
  | 'form'
  | 'submitting'
  | 'success'
  | 'error';

/**
 * Data carried through the flow.
 */
export interface FlowData {
  captureResult?: CaptureResult;
  annotatedScreenshot?: string;
  originalScreenshot?: string;
  context?: Partial<DeviceContext>;
  submitResult?: SubmitResult;
  error?: string;
}

/**
 * Complete flow state.
 */
export interface FlowState {
  step: FlowStep;
  data: FlowData;
}

/**
 * Actions that can transition the flow state.
 */
export type FlowAction =
  | { type: 'TRIGGER' }
  | { type: 'CAPTURE_START' }
  | { type: 'CAPTURE_DONE'; captureResult: CaptureResult; context: Partial<DeviceContext> }
  | { type: 'CAPTURE_ERROR'; error: string }
  | { type: 'ANNOTATE_DONE'; annotatedScreenshot: string; originalScreenshot: string }
  | { type: 'ANNOTATE_CANCEL' }
  | { type: 'RE_ANNOTATE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_DONE'; result: SubmitResult }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

/**
 * Creates the initial idle state.
 */
export function createFlowState(): FlowState {
  return { step: 'idle', data: {} };
}

/**
 * Pure reducer for the flow state machine.
 *
 * Returns a new FlowState given the current state and an action.
 * Invalid transitions return the current state unchanged.
 */
export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'TRIGGER':
      if (state.step !== 'idle') return state;
      return { step: 'triggered', data: {} };

    case 'CAPTURE_START':
      if (state.step !== 'triggered') return state;
      return { step: 'capturing', data: {} };

    case 'CAPTURE_DONE':
      if (state.step !== 'capturing') return state;
      return {
        step: 'annotating',
        data: {
          captureResult: action.captureResult,
          context: action.context,
        },
      };

    case 'CAPTURE_ERROR':
      if (state.step !== 'capturing') return state;
      return {
        step: 'error',
        data: { error: action.error },
      };

    case 'ANNOTATE_DONE':
      if (state.step !== 'annotating') return state;
      return {
        step: 'form',
        data: {
          ...state.data,
          annotatedScreenshot: action.annotatedScreenshot,
          originalScreenshot: action.originalScreenshot,
        },
      };

    case 'ANNOTATE_CANCEL':
      if (state.step !== 'annotating') return state;
      return createFlowState();

    case 'RE_ANNOTATE':
      if (state.step !== 'form') return state;
      return {
        step: 'annotating',
        data: {
          captureResult: state.data.captureResult,
          context: state.data.context,
        },
      };

    case 'SUBMIT_START':
      if (state.step !== 'form') return state;
      return { step: 'submitting', data: { ...state.data } };

    case 'SUBMIT_DONE':
      if (state.step !== 'submitting') return state;
      return {
        step: 'success',
        data: { ...state.data, submitResult: action.result },
      };

    case 'SUBMIT_ERROR':
      if (state.step !== 'submitting') return state;
      return {
        step: 'error',
        data: { ...state.data, error: action.error },
      };

    case 'RETRY':
      if (state.step !== 'error') return state;
      // Return to form if we have screenshot data, otherwise reset
      if (state.data.annotatedScreenshot) {
        return { step: 'form', data: { ...state.data, error: undefined } };
      }
      return createFlowState();

    case 'RESET':
      return createFlowState();

    default:
      return state;
  }
}
