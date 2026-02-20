// ---------------------------------------------------------------------------
// Tests for ShakeNbakeProvider, useShakeNbake, and flow state machine
//
// Since we cannot render React Native components in a vitest/node
// environment, we focus on:
// 1. Module exports are correctly shaped
// 2. Pure state machine logic (state-machine.ts)
// 3. Type shapes compile correctly
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock peer deps before imports
// ---------------------------------------------------------------------------

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios', Version: '17.0' },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  },
  PixelRatio: { get: () => 3, getFontScale: () => 1 },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
  Linking: { openURL: vi.fn() },
  Alert: { alert: vi.fn() },
  AccessibilityInfo: {
    isScreenReaderEnabled: vi.fn().mockResolvedValue(false),
    isReduceMotionEnabled: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('react-native-shake', () => ({
  default: {
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock('react-native-view-shot', () => ({
  captureRef: vi.fn().mockResolvedValue('mock-base64'),
}));

vi.mock('@shopify/react-native-skia', () => ({
  Canvas: 'SkiaCanvas',
  Image: 'SkiaImage',
  Path: 'SkiaPath',
  Rect: 'SkiaRect',
  Circle: 'SkiaCircle',
  Line: 'SkiaLine',
  Skia: {
    Path: { Make: () => ({ moveTo: vi.fn(), lineTo: vi.fn(), close: vi.fn(), reset: vi.fn(), copy: vi.fn() }) },
    Data: { fromBase64: () => ({}) },
  },
  makeImageFromEncoded: () => ({
    width: () => 390,
    height: () => 844,
    encodeToBase64: () => 'mock-base64-data',
  }),
  useCanvasRef: () => ({ current: null }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createFlowState,
  flowReducer,
} from '../ui/state-machine.js';
import type {
  FlowStep,
  FlowState,
  FlowAction,
} from '../ui/state-machine.js';

import { ShakeNbakeProvider, ShakeNbakeContext } from '../ShakeNbakeProvider.js';
import { useShakeNbake } from '../hooks/useShakeNbake.js';
import type { UseShakeNbakeResult } from '../hooks/useShakeNbake.js';

// ---------------------------------------------------------------------------
// 1. Module exports
// ---------------------------------------------------------------------------

describe('Provider module exports', () => {
  it('ShakeNbakeProvider is a function component', () => {
    expect(typeof ShakeNbakeProvider).toBe('function');
  });

  it('ShakeNbakeContext is a React context', () => {
    expect(ShakeNbakeContext).toBeDefined();
    expect(ShakeNbakeContext.Provider).toBeDefined();
    expect(ShakeNbakeContext.Consumer).toBeDefined();
  });

  it('useShakeNbake is a function', () => {
    expect(typeof useShakeNbake).toBe('function');
  });

  it('re-exports from index', async () => {
    const index = await import('../index.js');
    expect(typeof index.ShakeNbakeProvider).toBe('function');
    expect(typeof index.useShakeNbake).toBe('function');
    expect(index.ShakeNbakeContext).toBeDefined();
    expect(typeof index.createFlowState).toBe('function');
    expect(typeof index.flowReducer).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 2. State machine — createFlowState
// ---------------------------------------------------------------------------

describe('createFlowState', () => {
  it('returns idle state with empty data', () => {
    const state = createFlowState();
    expect(state.step).toBe('idle');
    expect(state.data).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// 3. State machine — flowReducer transitions
// ---------------------------------------------------------------------------

describe('flowReducer', () => {
  // ---- TRIGGER ----

  it('TRIGGER transitions idle -> triggered', () => {
    const state = createFlowState();
    const next = flowReducer(state, { type: 'TRIGGER' });
    expect(next.step).toBe('triggered');
  });

  it('TRIGGER from non-idle is a no-op', () => {
    const state: FlowState = { step: 'annotating', data: {} };
    const next = flowReducer(state, { type: 'TRIGGER' });
    expect(next).toBe(state);
  });

  // ---- CAPTURE_START ----

  it('CAPTURE_START transitions triggered -> capturing', () => {
    const state: FlowState = { step: 'triggered', data: {} };
    const next = flowReducer(state, { type: 'CAPTURE_START' });
    expect(next.step).toBe('capturing');
  });

  it('CAPTURE_START from non-triggered is a no-op', () => {
    const state: FlowState = { step: 'idle', data: {} };
    const next = flowReducer(state, { type: 'CAPTURE_START' });
    expect(next).toBe(state);
  });

  // ---- CAPTURE_DONE ----

  it('CAPTURE_DONE transitions capturing -> annotating with data', () => {
    const state: FlowState = { step: 'capturing', data: {} };
    const captureResult = {
      imageData: 'base64',
      dimensions: { width: 390, height: 844 },
      mimeType: 'image/png',
    };
    const context = { platform: { os: 'ios' } };
    const next = flowReducer(state, {
      type: 'CAPTURE_DONE',
      captureResult,
      context,
    });
    expect(next.step).toBe('annotating');
    expect(next.data.captureResult).toBe(captureResult);
    expect(next.data.context).toBe(context);
  });

  // ---- CAPTURE_ERROR ----

  it('CAPTURE_ERROR transitions capturing -> error', () => {
    const state: FlowState = { step: 'capturing', data: {} };
    const next = flowReducer(state, {
      type: 'CAPTURE_ERROR',
      error: 'No view ref',
    });
    expect(next.step).toBe('error');
    expect(next.data.error).toBe('No view ref');
  });

  // ---- ANNOTATE_DONE ----

  it('ANNOTATE_DONE transitions annotating -> form with screenshots', () => {
    const state: FlowState = {
      step: 'annotating',
      data: {
        captureResult: {
          imageData: 'base64',
          dimensions: { width: 390, height: 844 },
          mimeType: 'image/png',
        },
        context: { platform: { os: 'ios' } },
      },
    };
    const next = flowReducer(state, {
      type: 'ANNOTATE_DONE',
      annotatedScreenshot: 'annotated-base64',
      originalScreenshot: 'original-base64',
    });
    expect(next.step).toBe('form');
    expect(next.data.annotatedScreenshot).toBe('annotated-base64');
    expect(next.data.originalScreenshot).toBe('original-base64');
    // Preserves previous data
    expect(next.data.captureResult).toBeDefined();
    expect(next.data.context).toBeDefined();
  });

  // ---- ANNOTATE_CANCEL ----

  it('ANNOTATE_CANCEL transitions annotating -> idle', () => {
    const state: FlowState = {
      step: 'annotating',
      data: { captureResult: { imageData: 'x', dimensions: { width: 0, height: 0 }, mimeType: 'image/png' } },
    };
    const next = flowReducer(state, { type: 'ANNOTATE_CANCEL' });
    expect(next.step).toBe('idle');
    expect(next.data).toEqual({});
  });

  // ---- RE_ANNOTATE ----

  it('RE_ANNOTATE transitions form -> annotating, preserving capture data', () => {
    const captureResult = {
      imageData: 'base64',
      dimensions: { width: 390, height: 844 },
      mimeType: 'image/png',
    };
    const state: FlowState = {
      step: 'form',
      data: {
        captureResult,
        context: { platform: { os: 'ios' } },
        annotatedScreenshot: 'old-annotated',
        originalScreenshot: 'old-original',
      },
    };
    const next = flowReducer(state, { type: 'RE_ANNOTATE' });
    expect(next.step).toBe('annotating');
    expect(next.data.captureResult).toBe(captureResult);
    // Screenshot data should be cleared (re-annotation will produce new ones)
    expect(next.data.annotatedScreenshot).toBeUndefined();
  });

  // ---- SUBMIT_START ----

  it('SUBMIT_START transitions form -> submitting', () => {
    const state: FlowState = {
      step: 'form',
      data: { annotatedScreenshot: 'a', originalScreenshot: 'b' },
    };
    const next = flowReducer(state, { type: 'SUBMIT_START' });
    expect(next.step).toBe('submitting');
    expect(next.data.annotatedScreenshot).toBe('a');
  });

  // ---- SUBMIT_DONE ----

  it('SUBMIT_DONE transitions submitting -> success with result', () => {
    const state: FlowState = {
      step: 'submitting',
      data: { annotatedScreenshot: 'a', originalScreenshot: 'b' },
    };
    const result = { url: 'https://example.com', id: '1', success: true };
    const next = flowReducer(state, { type: 'SUBMIT_DONE', result });
    expect(next.step).toBe('success');
    expect(next.data.submitResult).toBe(result);
  });

  // ---- SUBMIT_ERROR ----

  it('SUBMIT_ERROR transitions submitting -> error', () => {
    const state: FlowState = {
      step: 'submitting',
      data: { annotatedScreenshot: 'a', originalScreenshot: 'b' },
    };
    const next = flowReducer(state, {
      type: 'SUBMIT_ERROR',
      error: 'Upload failed',
    });
    expect(next.step).toBe('error');
    expect(next.data.error).toBe('Upload failed');
    // Preserves screenshot data for potential retry
    expect(next.data.annotatedScreenshot).toBe('a');
  });

  // ---- RETRY ----

  it('RETRY from error with form data goes back to form', () => {
    const state: FlowState = {
      step: 'error',
      data: {
        annotatedScreenshot: 'a',
        originalScreenshot: 'b',
        error: 'Upload failed',
      },
    };
    const next = flowReducer(state, { type: 'RETRY' });
    expect(next.step).toBe('form');
    expect(next.data.error).toBeUndefined();
    expect(next.data.annotatedScreenshot).toBe('a');
  });

  it('RETRY from error without form data resets to idle', () => {
    const state: FlowState = {
      step: 'error',
      data: { error: 'Capture failed' },
    };
    const next = flowReducer(state, { type: 'RETRY' });
    expect(next.step).toBe('idle');
    expect(next.data).toEqual({});
  });

  it('RETRY from non-error is a no-op', () => {
    const state: FlowState = { step: 'form', data: {} };
    const next = flowReducer(state, { type: 'RETRY' });
    expect(next).toBe(state);
  });

  // ---- RESET ----

  it('RESET always goes back to idle', () => {
    const steps: FlowStep[] = [
      'idle',
      'triggered',
      'capturing',
      'annotating',
      'form',
      'submitting',
      'success',
      'error',
    ];
    for (const step of steps) {
      const state: FlowState = { step, data: { error: 'test' } };
      const next = flowReducer(state, { type: 'RESET' });
      expect(next.step).toBe('idle');
      expect(next.data).toEqual({});
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Full flow scenario
// ---------------------------------------------------------------------------

describe('Full flow state machine scenario', () => {
  it('follows complete happy path: idle -> triggered -> capturing -> annotating -> form -> submitting -> success -> idle', () => {
    let state = createFlowState();

    // Step 1: Trigger
    state = flowReducer(state, { type: 'TRIGGER' });
    expect(state.step).toBe('triggered');

    // Step 2: Capture starts
    state = flowReducer(state, { type: 'CAPTURE_START' });
    expect(state.step).toBe('capturing');

    // Step 3: Capture completes
    const captureResult = {
      imageData: 'screenshot-base64',
      dimensions: { width: 390, height: 844 },
      mimeType: 'image/png',
    };
    state = flowReducer(state, {
      type: 'CAPTURE_DONE',
      captureResult,
      context: { platform: { os: 'ios' } },
    });
    expect(state.step).toBe('annotating');
    expect(state.data.captureResult).toEqual(captureResult);

    // Step 4: Annotation done
    state = flowReducer(state, {
      type: 'ANNOTATE_DONE',
      annotatedScreenshot: 'annotated-base64',
      originalScreenshot: 'original-base64',
    });
    expect(state.step).toBe('form');
    expect(state.data.annotatedScreenshot).toBe('annotated-base64');

    // Step 5: Submit starts
    state = flowReducer(state, { type: 'SUBMIT_START' });
    expect(state.step).toBe('submitting');

    // Step 6: Submit succeeds
    const result = { url: 'https://linear.app/123', id: '123', success: true };
    state = flowReducer(state, { type: 'SUBMIT_DONE', result });
    expect(state.step).toBe('success');
    expect(state.data.submitResult).toEqual(result);

    // Step 7: Reset
    state = flowReducer(state, { type: 'RESET' });
    expect(state.step).toBe('idle');
  });

  it('handles retry after submit error', () => {
    let state: FlowState = {
      step: 'submitting',
      data: {
        annotatedScreenshot: 'a',
        originalScreenshot: 'b',
        captureResult: {
          imageData: 'x',
          dimensions: { width: 390, height: 844 },
          mimeType: 'image/png',
        },
      },
    };

    // Submit fails
    state = flowReducer(state, {
      type: 'SUBMIT_ERROR',
      error: 'Network error',
    });
    expect(state.step).toBe('error');
    expect(state.data.error).toBe('Network error');

    // Retry goes back to form
    state = flowReducer(state, { type: 'RETRY' });
    expect(state.step).toBe('form');
    expect(state.data.annotatedScreenshot).toBe('a');
    expect(state.data.error).toBeUndefined();
  });

  it('handles re-annotate from form', () => {
    const captureResult = {
      imageData: 'screenshot',
      dimensions: { width: 390, height: 844 },
      mimeType: 'image/png',
    };
    let state: FlowState = {
      step: 'form',
      data: {
        captureResult,
        context: { platform: { os: 'ios' } },
        annotatedScreenshot: 'old-annotation',
        originalScreenshot: 'old-original',
      },
    };

    // Re-annotate goes back to annotating
    state = flowReducer(state, { type: 'RE_ANNOTATE' });
    expect(state.step).toBe('annotating');
    expect(state.data.captureResult).toBe(captureResult);

    // New annotation done
    state = flowReducer(state, {
      type: 'ANNOTATE_DONE',
      annotatedScreenshot: 'new-annotation',
      originalScreenshot: 'new-original',
    });
    expect(state.step).toBe('form');
    expect(state.data.annotatedScreenshot).toBe('new-annotation');
  });
});

// ---------------------------------------------------------------------------
// 5. UseShakeNbakeResult type shape
// ---------------------------------------------------------------------------

describe('UseShakeNbakeResult type shape', () => {
  it('compiles with correct shape', () => {
    const mockResult: UseShakeNbakeResult = {
      trigger: vi.fn(),
      isOpen: false,
      currentStep: 'idle',
      config: {
        enabled: true,
        destination: {
          name: 'mock',
          uploadImage: vi.fn().mockResolvedValue('url'),
          createIssue: vi.fn().mockResolvedValue({ url: '', id: '', success: true }),
          testConnection: vi.fn().mockResolvedValue(true),
        },
      },
    };

    expect(typeof mockResult.trigger).toBe('function');
    expect(mockResult.isOpen).toBe(false);
    expect(mockResult.currentStep).toBe('idle');
    expect(mockResult.config.enabled).toBe(true);
  });
});
