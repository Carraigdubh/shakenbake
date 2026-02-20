// ---------------------------------------------------------------------------
// @shakenbake/web — ReportForm
// Modal overlay for composing and submitting a bug report.
// Rendered as a React Portal attached to document.body.
// ---------------------------------------------------------------------------

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type {
  DeviceContext,
  ReportInput,
  Severity,
  Category,
  SubmitResult,
} from '@shakenbake/core';
import { ShakeNbakeError, ERROR_MESSAGES } from '@shakenbake/core';
import type { ErrorCode } from '@shakenbake/core';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReportFormProps {
  annotatedScreenshot: string;
  originalScreenshot: string;
  dimensions: { width: number; height: number };
  context: Partial<DeviceContext>;
  onSubmit: (input: ReportInput) => Promise<SubmitResult>;
  onCancel: () => void;
  onReAnnotate?: () => void;
  theme?: 'light' | 'dark';
  accentColor?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES: Category[] = ['bug', 'ui', 'crash', 'performance', 'other'];

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug',
  ui: 'UI',
  crash: 'Crash',
  performance: 'Performance',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

function resolveTheme(theme: 'light' | 'dark' | undefined): 'light' | 'dark' {
  return theme ?? 'dark';
}

function getOverlayStyle(theme: 'light' | 'dark'): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '16px',
  };
}

function getModalStyle(theme: 'light' | 'dark'): CSSProperties {
  return {
    backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
    color: theme === 'dark' ? '#e0e0e0' : '#1a1a1a',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
    padding: '24px',
    position: 'relative',
  };
}

function getLabelStyle(theme: 'light' | 'dark'): CSSProperties {
  return {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
    color: theme === 'dark' ? '#b0b0b0' : '#555',
  };
}

function getInputStyle(theme: 'light' | 'dark', hasError: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: hasError
      ? '1px solid #ef4444'
      : theme === 'dark'
        ? '1px solid #444'
        : '1px solid #ccc',
    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f9f9f9',
    color: theme === 'dark' ? '#e0e0e0' : '#1a1a1a',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

function getPickerButtonStyle(
  theme: 'light' | 'dark',
  active: boolean,
  accentColor: string,
): CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: '6px',
    border: active
      ? `2px solid ${accentColor}`
      : theme === 'dark'
        ? '2px solid #444'
        : '2px solid #ddd',
    backgroundColor: active
      ? theme === 'dark'
        ? '#333'
        : '#e8f0fe'
      : 'transparent',
    color: active
      ? accentColor
      : theme === 'dark'
        ? '#ccc'
        : '#555',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    outline: 'none',
    lineHeight: '1.4',
  };
}

function getActionBtnStyle(
  variant: 'primary' | 'secondary' | 'link',
  theme: 'light' | 'dark',
  accentColor: string,
  disabled: boolean,
): CSSProperties {
  if (variant === 'primary') {
    return {
      padding: '10px 20px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: disabled ? '#888' : accentColor,
      color: '#ffffff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      outline: 'none',
      opacity: disabled ? 0.7 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    };
  }
  if (variant === 'link') {
    return {
      padding: '0',
      border: 'none',
      backgroundColor: 'transparent',
      color: accentColor,
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
      outline: 'none',
      textDecoration: 'underline',
    };
  }
  return {
    padding: '10px 20px',
    borderRadius: '6px',
    border: theme === 'dark' ? '1px solid #555' : '1px solid #ccc',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#e0e0e0' : '#1a1a1a',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: 400,
    outline: 'none',
    opacity: disabled ? 0.7 : 1,
  };
}

// ---------------------------------------------------------------------------
// FormState type
// ---------------------------------------------------------------------------

type FormPhase = 'editing' | 'submitting' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportForm({
  annotatedScreenshot,
  originalScreenshot,
  dimensions,
  context,
  onSubmit,
  onCancel,
  onReAnnotate,
  theme: themeProp,
  accentColor = '#6366f1',
}: ReportFormProps): React.JSX.Element | null {
  const theme = resolveTheme(themeProp);

  // -- Form fields --
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [category, setCategory] = useState<Category>('bug');
  const [contextExpanded, setContextExpanded] = useState(false);

  // -- Form state --
  const [phase, setPhase] = useState<FormPhase>('editing');
  const [titleTouched, setTitleTouched] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorRetryable, setErrorRetryable] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title on mount.
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // -- Validation --
  const titleError = useMemo(() => {
    if (!titleTouched) return '';
    if (!title.trim()) return 'Title is required';
    if (title.trim().length < 3) return 'Title must be at least 3 characters';
    return '';
  }, [title, titleTouched]);

  const isValid = title.trim().length >= 3;

  // -- Submit handler --
  const handleSubmit = useCallback(async () => {
    setTitleTouched(true);
    if (!isValid) return;

    setPhase('submitting');
    setErrorMessage('');

    const input: ReportInput = {
      title: title.trim(),
      description: description.trim(),
      severity,
      category,
      annotatedScreenshot,
      originalScreenshot,
    };

    try {
      const result = await onSubmit(input);
      setSubmitResult(result);
      setPhase('success');
    } catch (err: unknown) {
      if (err instanceof ShakeNbakeError) {
        setErrorMessage(ERROR_MESSAGES[err.code] ?? err.message);
        setErrorRetryable(err.retryable);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
        setErrorRetryable(false);
      } else {
        setErrorMessage('An unexpected error occurred while submitting the report.');
        setErrorRetryable(false);
      }
      setPhase('error');
    }
  }, [
    isValid,
    title,
    description,
    severity,
    category,
    annotatedScreenshot,
    originalScreenshot,
    onSubmit,
  ]);

  // -- Retry handler --
  const handleRetry = useCallback(() => {
    setPhase('editing');
    setErrorMessage('');
  }, []);

  // -- Keyboard shortcut (Escape to cancel) --
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'editing') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel, phase]);

  // -- Context JSON for display --
  const contextJson = useMemo(() => {
    try {
      return JSON.stringify(context, null, 2);
    } catch {
      return '{}';
    }
  }, [context]);

  // -- Portal target --
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  if (!portalTarget) return null;

  // -- Render: success state --
  if (phase === 'success' && submitResult) {
    return createPortal(
      <div
        style={getOverlayStyle(theme)}
        data-testid="report-form-overlay"
        role="dialog"
        aria-label="Bug report submitted"
      >
        <div style={getModalStyle(theme)} data-testid="report-form-modal">
          <div
            style={{ textAlign: 'center', padding: '24px 0' }}
            data-testid="report-form-success"
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '16px',
                lineHeight: '1',
              }}
              aria-hidden="true"
            >
              {'✓'}
            </div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Report Submitted
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: theme === 'dark' ? '#aaa' : '#666',
                marginBottom: '16px',
              }}
            >
              Your bug report has been created successfully.
            </p>
            {submitResult.url && (
              <a
                href={submitResult.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: accentColor,
                  fontSize: '14px',
                  textDecoration: 'underline',
                }}
                data-testid="report-form-issue-link"
              >
                View issue
              </a>
            )}
            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                style={getActionBtnStyle('secondary', theme, accentColor, false)}
                onClick={onCancel}
                data-testid="report-form-close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
      portalTarget,
    );
  }

  // -- Render: error state --
  if (phase === 'error') {
    return createPortal(
      <div
        style={getOverlayStyle(theme)}
        data-testid="report-form-overlay"
        role="dialog"
        aria-label="Bug report submission error"
      >
        <div style={getModalStyle(theme)} data-testid="report-form-modal">
          <div
            style={{ textAlign: 'center', padding: '24px 0' }}
            data-testid="report-form-error"
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '16px',
                lineHeight: '1',
                color: '#ef4444',
              }}
              aria-hidden="true"
            >
              {'!'}
            </div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Submission Failed
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: theme === 'dark' ? '#aaa' : '#666',
                marginBottom: '16px',
              }}
              data-testid="report-form-error-message"
            >
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {errorRetryable && (
                <button
                  type="button"
                  style={getActionBtnStyle('primary', theme, accentColor, false)}
                  onClick={handleRetry}
                  data-testid="report-form-retry"
                >
                  Try Again
                </button>
              )}
              {!errorRetryable && (
                <button
                  type="button"
                  style={getActionBtnStyle('primary', theme, accentColor, false)}
                  onClick={handleRetry}
                  data-testid="report-form-retry"
                >
                  Edit Report
                </button>
              )}
              <button
                type="button"
                style={getActionBtnStyle('secondary', theme, accentColor, false)}
                onClick={onCancel}
                data-testid="report-form-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>,
      portalTarget,
    );
  }

  const isSubmitting = phase === 'submitting';

  // -- Render: editing / submitting form --
  return createPortal(
    <div
      style={getOverlayStyle(theme)}
      data-testid="report-form-overlay"
      role="dialog"
      aria-label="Submit bug report"
    >
      <div style={getModalStyle(theme)} data-testid="report-form-modal">
        {/* Header */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '20px',
            margin: '0 0 20px 0',
          }}
        >
          Report a Bug
        </h2>

        {/* Title field */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="snb-title" style={getLabelStyle(theme)}>
            Title <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            ref={titleInputRef}
            id="snb-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTitleTouched(true)}
            placeholder="Brief description of the issue"
            disabled={isSubmitting}
            style={getInputStyle(theme, !!titleError)}
            data-testid="report-form-title"
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'snb-title-error' : undefined}
          />
          {titleError && (
            <p
              id="snb-title-error"
              style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '4px',
                margin: '4px 0 0 0',
              }}
              data-testid="report-form-title-error"
              role="alert"
            >
              {titleError}
            </p>
          )}
        </div>

        {/* Description field */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="snb-description" style={getLabelStyle(theme)}>
            Description
          </label>
          <textarea
            id="snb-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Steps to reproduce, expected vs actual behavior..."
            disabled={isSubmitting}
            rows={3}
            style={{
              ...getInputStyle(theme, false),
              resize: 'vertical',
              minHeight: '60px',
            }}
            data-testid="report-form-description"
          />
        </div>

        {/* Severity picker */}
        <div style={{ marginBottom: '16px' }}>
          <span style={getLabelStyle(theme)}>Severity</span>
          <div
            style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
            role="group"
            aria-label="Severity"
          >
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                style={getPickerButtonStyle(theme, severity === s, accentColor)}
                onClick={() => setSeverity(s)}
                disabled={isSubmitting}
                aria-pressed={severity === s}
                data-testid={`severity-${s}`}
              >
                {SEVERITY_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Category picker */}
        <div style={{ marginBottom: '16px' }}>
          <span style={getLabelStyle(theme)}>Category</span>
          <div
            style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
            role="group"
            aria-label="Category"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                style={getPickerButtonStyle(theme, category === c, accentColor)}
                onClick={() => setCategory(c)}
                disabled={isSubmitting}
                aria-pressed={category === c}
                data-testid={`category-${c}`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Screenshot preview */}
        <div style={{ marginBottom: '16px' }}>
          <span style={getLabelStyle(theme)}>Screenshot</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={annotatedScreenshot}
              alt="Annotated screenshot preview"
              style={{
                width: '80px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: theme === 'dark' ? '1px solid #444' : '1px solid #ddd',
                cursor: onReAnnotate ? 'pointer' : 'default',
              }}
              onClick={onReAnnotate}
              data-testid="report-form-screenshot-preview"
            />
            {onReAnnotate && (
              <button
                type="button"
                style={getActionBtnStyle('link', theme, accentColor, isSubmitting)}
                onClick={onReAnnotate}
                disabled={isSubmitting}
                data-testid="report-form-reannotate"
              >
                Edit annotations
              </button>
            )}
          </div>
        </div>

        {/* Collapsible device context */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setContextExpanded(!contextExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme === 'dark' ? '#aaa' : '#666',
              fontSize: '13px',
              fontWeight: 500,
              padding: '0',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            data-testid="report-form-context-toggle"
            aria-expanded={contextExpanded}
          >
            <span
              style={{
                display: 'inline-block',
                transition: 'transform 0.15s ease',
                transform: contextExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              {'\u25B6'}
            </span>
            Device Context
          </button>
          {contextExpanded && (
            <pre
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                border: theme === 'dark' ? '1px solid #444' : '1px solid #ddd',
                fontSize: '11px',
                lineHeight: '1.5',
                maxHeight: '200px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: '8px 0 0 0',
              }}
              data-testid="report-form-context-json"
            >
              {contextJson}
            </pre>
          )}
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            style={getActionBtnStyle('secondary', theme, accentColor, isSubmitting)}
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="report-form-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            style={getActionBtnStyle('primary', theme, accentColor, isSubmitting)}
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="report-form-submit"
          >
            {isSubmitting && (
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'snb-spin 0.6s linear infinite',
                }}
                data-testid="report-form-spinner"
                aria-hidden="true"
              />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>

        {/* Inline keyframes for spinner animation */}
        <style>{`
          @keyframes snb-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>,
    portalTarget,
  );
}
