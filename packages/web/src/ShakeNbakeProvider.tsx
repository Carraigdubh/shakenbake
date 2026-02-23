// ---------------------------------------------------------------------------
// @shakenbake/web — ShakeNbakeProvider
// Top-level React context provider that orchestrates the full bug-report flow:
//   idle -> triggered -> capturing -> annotating -> form -> submitting -> success/error -> idle
// ---------------------------------------------------------------------------

'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  ShakeNbakeConfig,
  CaptureResult,
  DeviceContext,
  ReportInput,
  SubmitResult,
  BugReport,
} from '@shakenbake/core';
import { PluginRegistry, ShakeNbakeError } from '@shakenbake/core';

import { KeyboardTrigger } from './triggers/keyboard.js';
import { FABTrigger } from './triggers/fab.js';
import { Html2CanvasCapture } from './capture/screenshot.js';
import { BrowserContextCollector } from './context/collectors.js';
import { ConsoleInterceptor } from './context/console-interceptor.js';
import { DrawingCanvas } from './annotate/DrawingCanvas.js';
import { ReportForm } from './ui/ReportForm.js';

// ---------------------------------------------------------------------------
// State machine types
// ---------------------------------------------------------------------------

export type FlowStep =
  | 'idle'
  | 'triggered'
  | 'capturing'
  | 'annotating'
  | 'form'
  | 'submitting'
  | 'success'
  | 'error';

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface ShakeNbakeContextValue {
  trigger: () => void;
  isOpen: boolean;
  currentStep: FlowStep;
  config: ShakeNbakeConfig;
}

export const ShakeNbakeContext = createContext<ShakeNbakeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

export interface ShakeNbakeProviderProps {
  config: ShakeNbakeConfig;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

export function ShakeNbakeProvider({
  config,
  children,
}: ShakeNbakeProviderProps): React.JSX.Element {
  // -- State --
  const [step, setStep] = useState<FlowStep>('idle');
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [annotatedScreenshot, setAnnotatedScreenshot] = useState<string>('');
  const [originalScreenshot, setOriginalScreenshot] = useState<string>('');
  const [deviceContext, setDeviceContext] = useState<Partial<DeviceContext>>({});
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorRetryable, setErrorRetryable] = useState<boolean>(false);

  // -- Refs for plugin instances (survive re-renders) --
  const registryRef = useRef<PluginRegistry | null>(null);
  const consoleInterceptorRef = useRef<ConsoleInterceptor | null>(null);

  // Resolve theme: 'auto' maps to OS preference; default to 'dark'.
  const resolvedTheme = useMemo((): 'light' | 'dark' => {
    const uiTheme = config.ui?.theme;
    if (uiTheme === 'light') return 'light';
    if (uiTheme === 'dark') return 'dark';
    // auto or undefined: try to match OS preference
    if (uiTheme === 'auto' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    }
    return 'dark';
  }, [config.ui?.theme]);

  const accentColor = config.ui?.accentColor ?? '#6366f1';

  // -- Trigger callback (stable ref) --
  const triggerFlow = useCallback(() => {
    if (!config.enabled) return;
    if (step !== 'idle') return; // already in progress
    setStep('triggered');
  }, [config.enabled, step]);

  // -- Setup / teardown --
  useEffect(() => {
    if (!config.enabled) return;

    const registry = new PluginRegistry();
    registryRef.current = registry;

    // Register keyboard trigger (always).
    registry.registerTrigger(new KeyboardTrigger());

    // Register FAB trigger if configured.
    if (config.ui?.showFAB) {
      registry.registerTrigger(
        new FABTrigger({ position: config.ui.position ?? 'bottom-right' }),
      );
    }

    // Register capture plugin.
    registry.registerCapture(new Html2CanvasCapture());

    // Register console interceptor + context collector.
    const consoleInterceptor = new ConsoleInterceptor();
    consoleInterceptorRef.current = consoleInterceptor;
    consoleInterceptor.install();

    registry.registerCollector(
      new BrowserContextCollector({
        consoleInterceptor,
        redactFields: config.privacy?.redactFields,
      }),
    );

    // Register any additional user-provided triggers.
    if (config.triggers) {
      for (const trigger of config.triggers) {
        registry.registerTrigger(trigger);
      }
    }

    // Register any additional user-provided context collectors.
    if (config.contextCollectors) {
      for (const collector of config.contextCollectors) {
        registry.registerCollector(collector);
      }
    }

    // Activate triggers — the callback will set step to 'triggered'.
    let cancelled = false;

    const activateAll = async () => {
      if (cancelled) return;
      await registry.activateTriggers(() => {
        setStep((current) => {
          if (current !== 'idle') return current;
          return 'triggered';
        });
      });
    };

    activateAll();

    return () => {
      cancelled = true;
      registry.deactivateTriggers();
      consoleInterceptor.uninstall();
      registry.clear();
      registryRef.current = null;
      consoleInterceptorRef.current = null;
    };
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Triggered -> Capturing --
  useEffect(() => {
    if (step !== 'triggered') return;

    let cancelled = false;

    const doCapture = async () => {
      setStep('capturing');

      const registry = registryRef.current;
      const capture = registry?.getCapture();
      if (!capture) {
        setErrorMessage('No capture plugin registered.');
        setStep('error');
        return;
      }

      try {
        // Collect context in parallel with capture.
        const [result, ctx] = await Promise.all([
          capture.capture(),
          registry!.collectContext(),
        ]);

        if (cancelled) return;

        setCaptureResult(result);
        setDeviceContext(ctx);
        setStep('annotating');
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Screenshot capture failed',
        );
        setStep('error');
      }
    };

    void doCapture();
    return () => {
      cancelled = true;
    };
  }, [step]);

  // -- Success auto-dismiss after 3 seconds --
  useEffect(() => {
    if (step !== 'success') return;

    const timer = setTimeout(() => {
      resetFlow();
    }, 3000);

    return () => clearTimeout(timer);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Flow reset --
  const resetFlow = useCallback(() => {
    setStep('idle');
    setCaptureResult(null);
    setAnnotatedScreenshot('');
    setOriginalScreenshot('');
    setDeviceContext({});
    setSubmitResult(null);
    setErrorMessage('');
    setErrorRetryable(false);
  }, []);

  // -- DrawingCanvas handlers --
  const handleAnnotationDone = useCallback(
    (annotated: string, original: string) => {
      setAnnotatedScreenshot(annotated);
      setOriginalScreenshot(original);
      setStep('form');
    },
    [],
  );

  const handleAnnotationCancel = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  // -- ReportForm handlers --
  const handleFormSubmit = useCallback(
    async (input: ReportInput): Promise<SubmitResult> => {
      setStep('submitting');

      try {
        // Build minimal BugReport for the adapter.
        const report: BugReport = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          title: input.title,
          description: input.description,
          severity: input.severity,
          category: input.category,
          screenshot: {
            annotated: input.annotatedScreenshot,
            original: input.originalScreenshot,
            dimensions: captureResult?.dimensions ?? { width: 0, height: 0 },
          },
          context: {
            platform: { os: 'unknown' },
            device: {},
            screen: { width: 0, height: 0 },
            network: {},
            battery: {},
            locale: {},
            app: {},
            accessibility: {},
            performance: {},
            navigation: {},
            console: {},
            ...deviceContext,
          } as DeviceContext,
          customMetadata: config.customMetadata?.(),
        };

        // Create issue. The DestinationAdapter.createIssue() handles
        // screenshot uploads internally (e.g., LinearAdapter uploads then creates).
        const result = await config.destination.createIssue(report);
        setSubmitResult(result);
        setStep('success');
        return result;
      } catch (err: unknown) {
        if (err instanceof ShakeNbakeError) {
          setErrorMessage(err.message);
          setErrorRetryable(err.retryable);
        } else {
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to submit report',
          );
          setErrorRetryable(false);
        }
        setStep('error');
        throw err; // Re-throw so the form can also display the error
      }
    },
    [captureResult, deviceContext, config],
  );

  const handleFormCancel = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  const handleReAnnotate = useCallback(() => {
    setStep('annotating');
  }, []);

  // -- Error handlers --
  const handleErrorRetry = useCallback(() => {
    if (annotatedScreenshot) {
      setStep('form');
    } else {
      resetFlow();
    }
  }, [annotatedScreenshot, resetFlow]);

  const handleErrorDismiss = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  // -- Success click to dismiss early --
  const handleSuccessDismiss = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  // -- Context value --
  const contextValue = useMemo<ShakeNbakeContextValue>(
    () => ({
      trigger: triggerFlow,
      isOpen: step !== 'idle',
      currentStep: step,
      config,
    }),
    [triggerFlow, step, config],
  );

  return (
    <ShakeNbakeContext.Provider value={contextValue}>
      {children}

      {/* Annotating overlay */}
      {step === 'annotating' && captureResult && (
        <DrawingCanvas
          screenshot={captureResult.imageData}
          dimensions={captureResult.dimensions}
          onDone={handleAnnotationDone}
          onCancel={handleAnnotationCancel}
          theme={resolvedTheme}
          accentColor={accentColor}
        />
      )}

      {/* Report form overlay */}
      {(step === 'form' || step === 'submitting') && (
        <ReportForm
          annotatedScreenshot={annotatedScreenshot}
          originalScreenshot={originalScreenshot}
          dimensions={captureResult?.dimensions ?? { width: 0, height: 0 }}
          context={deviceContext}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          onReAnnotate={handleReAnnotate}
          theme={resolvedTheme}
          accentColor={accentColor}
        />
      )}

      {/* Success overlay */}
      {step === 'success' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            cursor: 'pointer',
          }}
          onClick={handleSuccessDismiss}
          data-testid="shakenbake-success-overlay"
          role="status"
          aria-label="Bug report submitted successfully"
        >
          <div
            style={{
              backgroundColor: resolvedTheme === 'dark' ? '#1e1e1e' : '#ffffff',
              color: resolvedTheme === 'dark' ? '#e0e0e0' : '#1a1a1a',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              maxWidth: '400px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{ fontSize: '48px', marginBottom: '12px', lineHeight: '1' }}
              aria-hidden="true"
            >
              {'✓'}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>
              Report Submitted
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: resolvedTheme === 'dark' ? '#aaa' : '#666',
                margin: '0 0 12px 0',
              }}
            >
              Your bug report has been created successfully.
            </p>
            {submitResult?.url && (
              <a
                href={submitResult.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: accentColor, fontSize: '14px' }}
                onClick={(e) => e.stopPropagation()}
                data-testid="shakenbake-success-link"
              >
                View issue
              </a>
            )}
            <p
              style={{
                fontSize: '12px',
                color: resolvedTheme === 'dark' ? '#666' : '#aaa',
                marginTop: '12px',
                margin: '12px 0 0 0',
              }}
            >
              Closing automatically...
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {step === 'error' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
          data-testid="shakenbake-error-overlay"
          role="alert"
        >
          <div
            style={{
              backgroundColor: resolvedTheme === 'dark' ? '#1e1e1e' : '#ffffff',
              color: resolvedTheme === 'dark' ? '#e0e0e0' : '#1a1a1a',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              maxWidth: '400px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '12px',
                lineHeight: '1',
                color: '#ef4444',
              }}
              aria-hidden="true"
            >
              {'!'}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: resolvedTheme === 'dark' ? '#aaa' : '#666',
                margin: '0 0 16px 0',
              }}
              data-testid="shakenbake-error-message"
            >
              {errorMessage || 'An unexpected error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {errorRetryable && (
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: accentColor,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                  onClick={handleErrorRetry}
                  data-testid="shakenbake-error-retry"
                >
                  Try Again
                </button>
              )}
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border:
                    resolvedTheme === 'dark'
                      ? '1px solid #555'
                      : '1px solid #ccc',
                  backgroundColor: 'transparent',
                  color: resolvedTheme === 'dark' ? '#e0e0e0' : '#1a1a1a',
                  cursor: 'pointer',
                  fontSize: '14px',
                  outline: 'none',
                }}
                onClick={handleErrorDismiss}
                data-testid="shakenbake-error-dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </ShakeNbakeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

