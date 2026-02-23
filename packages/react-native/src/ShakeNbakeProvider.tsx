// ---------------------------------------------------------------------------
// @shakenbake/react-native — ShakeNbakeProvider
//
// Top-level React context provider that wraps the host app and manages the
// entire bug-reporting lifecycle:
//   idle -> triggered -> capturing -> annotating -> form -> submitting -> success/error -> idle
//
// On mount it registers the default plugins (ShakeTrigger, ViewShotCapture,
// DeviceContextCollector), activates triggers, and wraps children in a
// capturable View for react-native-view-shot.
//
// Since `react-native` is a peer dependency, all RN components are loaded
// dynamically at runtime using the established pattern.
// ---------------------------------------------------------------------------

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  ShakeNbakeConfig,
  ReportInput,
  SubmitResult,
  DeviceContext,
  CaptureResult,
} from '@shakenbake/core';
import { PluginRegistry, ReportBuilder } from '@shakenbake/core';

import { ShakeTrigger } from './triggers/shake.js';
import { ViewShotCapture } from './capture/screenshot.js';
import { DeviceContextCollector } from './context/collectors.js';
import { DrawingCanvas } from './annotate/DrawingCanvas.js';
import { ReportForm } from './ui/ReportForm.js';
import type { FlowStep } from './ui/state-machine.js';
import { createFlowState, flowReducer } from './ui/state-machine.js';
import type { UseShakeNbakeResult } from './hooks/useShakeNbake.js';

// ---------------------------------------------------------------------------
// React Native module shape (peer dep)
// ---------------------------------------------------------------------------

interface RNModule {
  View: React.ComponentType<Record<string, unknown>>;
  Text: React.ComponentType<Record<string, unknown>>;
  TouchableOpacity: React.ComponentType<Record<string, unknown>>;
  Alert: {
    alert(title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: string }>): void;
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const ShakeNbakeContext = createContext<UseShakeNbakeResult | null>(null);

// ---------------------------------------------------------------------------
// Provider Props
// ---------------------------------------------------------------------------

export interface ShakeNbakeProviderProps {
  config: ShakeNbakeConfig;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// ShakeNbakeProvider component
// ---------------------------------------------------------------------------

/**
 * Wraps the host app and manages the bug-reporting flow.
 *
 * 1. On mount: creates PluginRegistry, registers ShakeTrigger + ViewShotCapture +
 *    DeviceContextCollector, activates triggers.
 * 2. On trigger: captures screenshot, opens annotation canvas, then report form.
 * 3. On submit: builds BugReport and submits via the DestinationAdapter.
 * 4. On unmount: deactivates all triggers.
 *
 * @example
 * ```tsx
 * <ShakeNbakeProvider config={{ enabled: true, destination: myAdapter }}>
 *   <App />
 * </ShakeNbakeProvider>
 * ```
 */
export function ShakeNbakeProvider(
  props: ShakeNbakeProviderProps,
): React.ReactNode {
  const { config, children } = props;

  // ---- Module loading ----
  const [rn, setRn] = useState<RNModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const mod = await import('react-native');
        if (!cancelled) setRn(mod as unknown as RNModule);
      } catch {
        // react-native not available — provider still renders children
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Plugin system ----
  const registryRef = useRef<PluginRegistry | null>(null);
  const builderRef = useRef<ReportBuilder | null>(null);
  const capturePluginRef = useRef<ViewShotCapture | null>(null);
  const viewRef = useRef<unknown>(null);

  // ---- Flow state ----
  const [flowState, setFlowState] = useState(createFlowState);

  const dispatch = useCallback(
    (action: Parameters<typeof flowReducer>[1]) => {
      setFlowState((prev) => flowReducer(prev, action));
    },
    [],
  );

  // ---- Initialize plugins on mount ----
  useEffect(() => {
    if (!config.enabled) return;

    const registry = new PluginRegistry();
    const capturePlugin = new ViewShotCapture();
    capturePluginRef.current = capturePlugin;

    // Register defaults
    const shakeTrigger = new ShakeTrigger();
    registry.registerTrigger(shakeTrigger);
    registry.registerCapture(capturePlugin);
    registry.registerCollector(
      new DeviceContextCollector({
        redactFields: config.privacy?.redactFields,
      }),
    );

    // Register additional triggers from config
    if (config.triggers) {
      for (const trigger of config.triggers) {
        registry.registerTrigger(trigger);
      }
    }

    // Register additional collectors from config
    if (config.contextCollectors) {
      for (const collector of config.contextCollectors) {
        registry.registerCollector(collector);
      }
    }

    const builder = new ReportBuilder(registry, config.destination);
    registryRef.current = registry;
    builderRef.current = builder;

    return () => {
      registry.deactivateTriggers();
      registry.clear();
      registryRef.current = null;
      builderRef.current = null;
    };
  }, [config]);

  // ---- Trigger handler ----
  const handleTrigger = useCallback(() => {
    if (!config.enabled) return;
    setFlowState((prev) => {
      if (prev.step !== 'idle') return prev;
      return flowReducer(prev, { type: 'TRIGGER' });
    });
  }, [config.enabled]);

  // ---- Activate triggers with the handler ----
  useEffect(() => {
    let cancelled = false;

    const activateAll = async () => {
      const registry = registryRef.current;
      if (!registry || cancelled) return;
      await registry.activateTriggers(handleTrigger);
    };

    if (config.enabled) {
      activateAll();
    }

    return () => {
      cancelled = true;
      registryRef.current?.deactivateTriggers();
    };
  }, [config.enabled, handleTrigger]);

  // ---- Set capture ref when viewRef becomes available ----
  useEffect(() => {
    if (capturePluginRef.current && viewRef.current) {
      capturePluginRef.current.setRef(
        viewRef as React.RefObject<unknown>,
      );
    }
  });

  // ---- Auto-capture when triggered ----
  useEffect(() => {
    if (flowState.step !== 'triggered') return;

    let cancelled = false;

    async function captureAndCollect(): Promise<void> {
      dispatch({ type: 'CAPTURE_START' });

      try {
        const builder = builderRef.current;
        if (!builder) {
          dispatch({ type: 'CAPTURE_ERROR', error: 'ReportBuilder not initialized' });
          return;
        }

        const [captureResult, context] = await Promise.all([
          builder.startCapture(),
          builder.collectContext(),
        ]);

        if (cancelled) return;

        dispatch({
          type: 'CAPTURE_DONE',
          captureResult,
          context,
        });
      } catch (err) {
        if (cancelled) return;
        dispatch({
          type: 'CAPTURE_ERROR',
          error: err instanceof Error ? err.message : 'Capture failed',
        });
      }
    }

    void captureAndCollect();

    return () => {
      cancelled = true;
    };
  }, [flowState.step, dispatch]);

  // ---- Annotation done handler ----
  const handleAnnotationDone = useCallback(
    (annotatedBase64: string, originalBase64: string) => {
      dispatch({
        type: 'ANNOTATE_DONE',
        annotatedScreenshot: annotatedBase64,
        originalScreenshot: originalBase64,
      });
    },
    [dispatch],
  );

  const handleAnnotationCancel = useCallback(() => {
    dispatch({ type: 'ANNOTATE_CANCEL' });
  }, [dispatch]);

  const handleReAnnotate = useCallback(() => {
    dispatch({ type: 'RE_ANNOTATE' });
  }, [dispatch]);

  // ---- Form submit handler ----
  const handleFormSubmit = useCallback(
    async (input: ReportInput): Promise<SubmitResult> => {
      dispatch({ type: 'SUBMIT_START' });

      try {
        const builder = builderRef.current;
        if (!builder) {
          throw new Error('ReportBuilder not initialized');
        }

        const context = (flowState.data.context ?? {}) as DeviceContext;
        const report = builder.build(input, context);

        // Attach custom metadata if configured
        if (config.customMetadata) {
          report.customMetadata = config.customMetadata();
        }

        // Set proper dimensions
        if (flowState.data.captureResult) {
          report.screenshot.dimensions = flowState.data.captureResult.dimensions;
        }

        const result = await builder.submit(report);

        dispatch({ type: 'SUBMIT_DONE', result });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Submit failed';
        dispatch({ type: 'SUBMIT_ERROR', error: errorMsg });
        throw err;
      }
    },
    [dispatch, flowState.data, config],
  );

  // ---- Form cancel handler ----
  const handleFormCancel = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // ---- Handle success dismiss ----
  const handleSuccessDismiss = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // ---- Handle error ----
  useEffect(() => {
    if (flowState.step !== 'error' || !rn) return;

    const errorMsg = flowState.data.error ?? 'An unexpected error occurred';
    const hasFormData = Boolean(flowState.data.annotatedScreenshot);

    rn.Alert.alert(
      'Error',
      errorMsg,
      [
        ...(hasFormData
          ? [{ text: 'Retry', onPress: () => dispatch({ type: 'RETRY' }) }]
          : []),
        {
          text: 'Dismiss',
          style: 'cancel',
          onPress: () => dispatch({ type: 'RESET' }),
        },
      ],
    );
  }, [flowState.step, flowState.data, rn, dispatch]);

  // ---- Handle success alert ----
  useEffect(() => {
    if (flowState.step !== 'success' || !rn) return;

    const result = flowState.data.submitResult;
    rn.Alert.alert(
      'Report Submitted',
      result?.url ? `Issue created: ${result.url}` : 'Your bug report has been submitted.',
      [{ text: 'OK', onPress: handleSuccessDismiss }],
    );
  }, [flowState.step, flowState.data, rn, handleSuccessDismiss]);

  // ---- Resolve theme ----
  const theme = useMemo((): 'light' | 'dark' => {
    const configTheme = config.ui?.theme;
    if (configTheme === 'light' || configTheme === 'dark') return configTheme;
    // For 'auto' or undefined, default to dark
    return 'dark';
  }, [config.ui?.theme]);

  // ---- Context value ----
  const contextValue = useMemo<UseShakeNbakeResult>(
    () => ({
      trigger: handleTrigger,
      isOpen: flowState.step !== 'idle',
      currentStep: flowState.step,
      config,
    }),
    [handleTrigger, flowState.step, config],
  );

  // ---- Render ----

  // If react-native is not loaded yet, just render children in a fragment
  const wrapperElement = rn
    ? React.createElement(
        rn.View,
        { ref: viewRef, style: { flex: 1 }, collapsable: false },
        children,
      )
    : React.createElement(React.Fragment, null, children);

  // Overlay components based on flow state
  let overlay: React.ReactNode = null;

  if (flowState.step === 'annotating' && flowState.data.captureResult) {
    overlay = React.createElement(DrawingCanvas, {
      screenshot: flowState.data.captureResult.imageData,
      dimensions: flowState.data.captureResult.dimensions,
      onDone: handleAnnotationDone,
      onCancel: handleAnnotationCancel,
    });
  }

  if (
    (flowState.step === 'form' || flowState.step === 'submitting') &&
    flowState.data.annotatedScreenshot &&
    flowState.data.originalScreenshot
  ) {
    overlay = React.createElement(ReportForm, {
      annotatedScreenshot: flowState.data.annotatedScreenshot,
      originalScreenshot: flowState.data.originalScreenshot,
      dimensions: flowState.data.captureResult?.dimensions ?? {
        width: 0,
        height: 0,
      },
      context: flowState.data.context ?? {},
      onSubmit: handleFormSubmit,
      onCancel: handleFormCancel,
      onReAnnotate: handleReAnnotate,
      theme,
      accentColor: config.ui?.accentColor,
    });
  }

  return React.createElement(
    ShakeNbakeContext.Provider,
    { value: contextValue },
    wrapperElement,
    overlay,
  );
}
