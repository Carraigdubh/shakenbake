import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportForm } from '../ui/ReportForm.js';
import type { ReportFormProps } from '../ui/ReportForm.js';
import type { SubmitResult } from '@shakenbake/core';
import { ShakeNbakeError } from '@shakenbake/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_ANNOTATED = 'data:image/png;base64,annotatedData';
const FAKE_ORIGINAL = 'data:image/png;base64,originalData';
const FAKE_DIMENSIONS = { width: 800, height: 600 };
const FAKE_CONTEXT = {
  platform: { os: 'macOS' },
  screen: { width: 1920, height: 1080 },
};

function defaultProps(overrides?: Partial<ReportFormProps>): ReportFormProps {
  return {
    annotatedScreenshot: FAKE_ANNOTATED,
    originalScreenshot: FAKE_ORIGINAL,
    dimensions: FAKE_DIMENSIONS,
    context: FAKE_CONTEXT,
    onSubmit: vi.fn(async () => ({
      url: 'https://linear.app/issue/123',
      id: '123',
      success: true,
    })),
    onCancel: vi.fn(),
    ...overrides,
  };
}

function renderForm(
  overrides?: Partial<ReportFormProps>,
): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const props = defaultProps(overrides);

  act(() => {
    root.render(createElement(ReportForm, props));
  });

  return { container, root };
}

function cleanup(
  container: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

// ---------------------------------------------------------------------------
// Helpers for querying inside the portal (appended to document.body)
// ---------------------------------------------------------------------------

function queryBody(selector: string): HTMLElement | null {
  return document.body.querySelector(selector);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReportForm', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    if (container) cleanup(container, root);
    // Clean up any portal elements remaining in body.
    document.body.querySelectorAll('[data-testid="report-form-overlay"]').forEach((el) => el.remove());
  });

  // -- Rendering --

  it('renders the form overlay via portal', () => {
    ({ container, root } = renderForm());
    const overlay = queryBody('[data-testid="report-form-overlay"]');
    expect(overlay).not.toBeNull();
  });

  it('renders the modal container', () => {
    ({ container, root } = renderForm());
    const modal = queryBody('[data-testid="report-form-modal"]');
    expect(modal).not.toBeNull();
  });

  it('renders title input', () => {
    ({ container, root } = renderForm());
    const input = queryBody('[data-testid="report-form-title"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe('text');
  });

  it('renders description textarea', () => {
    ({ container, root } = renderForm());
    const textarea = queryBody('[data-testid="report-form-description"]') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
  });

  it('renders severity buttons with medium selected by default', () => {
    ({ container, root } = renderForm());
    for (const sev of ['low', 'medium', 'high', 'critical'] as const) {
      const btn = queryBody(`[data-testid="severity-${sev}"]`);
      expect(btn).not.toBeNull();
    }
    const mediumBtn = queryBody('[data-testid="severity-medium"]') as HTMLButtonElement;
    expect(mediumBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders category buttons with bug selected by default', () => {
    ({ container, root } = renderForm());
    for (const cat of ['bug', 'ui', 'crash', 'performance', 'other'] as const) {
      const btn = queryBody(`[data-testid="category-${cat}"]`);
      expect(btn).not.toBeNull();
    }
    const bugBtn = queryBody('[data-testid="category-bug"]') as HTMLButtonElement;
    expect(bugBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders screenshot preview', () => {
    ({ container, root } = renderForm());
    const img = queryBody('[data-testid="report-form-screenshot-preview"]') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain('annotatedData');
  });

  it('renders submit and cancel buttons', () => {
    ({ container, root } = renderForm());
    expect(queryBody('[data-testid="report-form-submit"]')).not.toBeNull();
    expect(queryBody('[data-testid="report-form-cancel"]')).not.toBeNull();
  });

  // -- Title validation --

  it('shows title error when title is empty and blurred', () => {
    ({ container, root } = renderForm());
    const input = queryBody('[data-testid="report-form-title"]') as HTMLInputElement;

    act(() => {
      input.focus();
      input.blur();
      // Dispatch blur event.
      const event = new Event('blur', { bubbles: true });
      input.dispatchEvent(event);
    });

    const error = queryBody('[data-testid="report-form-title-error"]');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain('Title is required');
  });

  it('shows title error when title is less than 3 characters on submit', () => {
    ({ container, root } = renderForm());
    const input = queryBody('[data-testid="report-form-title"]') as HTMLInputElement;

    // Type a short title (less than 3 characters).
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      nativeInputValueSetter.call(input, 'ab');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Try to submit — this should trigger validation and mark title as touched.
    const submitBtn = queryBody('[data-testid="report-form-submit"]') as HTMLButtonElement;
    act(() => {
      submitBtn.click();
    });

    // The validation message should appear.
    // Even if React controlled value didn't update, the title state is still
    // empty or short, so submitting validates and shows an error.
    const error = queryBody('[data-testid="report-form-title-error"]');
    expect(error).not.toBeNull();
  });

  it('shows title error on submit click when title is empty', () => {
    ({ container, root } = renderForm());
    const submitBtn = queryBody('[data-testid="report-form-submit"]') as HTMLButtonElement;

    act(() => {
      submitBtn.click();
    });

    const error = queryBody('[data-testid="report-form-title-error"]');
    expect(error).not.toBeNull();
  });

  // -- Severity / category selection --

  it('changes severity when a severity button is clicked', () => {
    ({ container, root } = renderForm());
    const highBtn = queryBody('[data-testid="severity-high"]') as HTMLButtonElement;

    act(() => {
      highBtn.click();
    });

    expect(highBtn.getAttribute('aria-pressed')).toBe('true');
    const mediumBtn = queryBody('[data-testid="severity-medium"]') as HTMLButtonElement;
    expect(mediumBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('changes category when a category button is clicked', () => {
    ({ container, root } = renderForm());
    const perfBtn = queryBody('[data-testid="category-performance"]') as HTMLButtonElement;

    act(() => {
      perfBtn.click();
    });

    expect(perfBtn.getAttribute('aria-pressed')).toBe('true');
    const bugBtn = queryBody('[data-testid="category-bug"]') as HTMLButtonElement;
    expect(bugBtn.getAttribute('aria-pressed')).toBe('false');
  });

  // -- Context toggle --

  it('shows device context JSON when toggle is clicked', () => {
    ({ container, root } = renderForm());

    // Context should not be visible initially.
    expect(queryBody('[data-testid="report-form-context-json"]')).toBeNull();

    const toggle = queryBody('[data-testid="report-form-context-toggle"]') as HTMLButtonElement;
    act(() => {
      toggle.click();
    });

    const json = queryBody('[data-testid="report-form-context-json"]');
    expect(json).not.toBeNull();
    expect(json!.textContent).toContain('macOS');
  });

  // -- Cancel --

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    ({ container, root } = renderForm({ onCancel }));

    const cancelBtn = queryBody('[data-testid="report-form-cancel"]') as HTMLButtonElement;
    act(() => {
      cancelBtn.click();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // -- Submit --

  it('calls onSubmit with correct ReportInput on submit', async () => {
    const onSubmit = vi.fn(async (): Promise<SubmitResult> => ({
      url: 'https://linear.app/issue/123',
      id: '123',
      success: true,
    }));

    ({ container, root } = renderForm({ onSubmit }));

    // Type title.
    const input = queryBody('[data-testid="report-form-title"]') as HTMLInputElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      nativeInputValueSetter.call(input, 'Test bug title');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Select severity.
    const highBtn = queryBody('[data-testid="severity-high"]') as HTMLButtonElement;
    act(() => {
      highBtn.click();
    });

    // Select category.
    const uiBtn = queryBody('[data-testid="category-ui"]') as HTMLButtonElement;
    act(() => {
      uiBtn.click();
    });

    // Submit.
    const submitBtn = queryBody('[data-testid="report-form-submit"]') as HTMLButtonElement;
    await act(async () => {
      submitBtn.click();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [reportInput] = onSubmit.mock.calls[0]!;
    expect(reportInput.title).toBe('Test bug title');
    expect(reportInput.severity).toBe('high');
    expect(reportInput.category).toBe('ui');
    expect(reportInput.annotatedScreenshot).toBe(FAKE_ANNOTATED);
    expect(reportInput.originalScreenshot).toBe(FAKE_ORIGINAL);
  });

  // -- Loading state --

  it('shows loading spinner during submission', async () => {
    // Make the submit hang forever.
    const onSubmit = vi.fn(
      () => new Promise<SubmitResult>(() => {}), // never resolves
    );

    ({ container, root } = renderForm({ onSubmit }));

    // Type title.
    const input = queryBody('[data-testid="report-form-title"]') as HTMLInputElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      nativeInputValueSetter.call(input, 'Test bug title');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Click submit (will not resolve).
    act(() => {
      const submitBtn = queryBody('[data-testid="report-form-submit"]') as HTMLButtonElement;
      submitBtn.click();
    });

    // Wait for React to process.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const spinner = queryBody('[data-testid="report-form-spinner"]');
    expect(spinner).not.toBeNull();

    // Submit button should be disabled.
    const submitBtn = queryBody('[data-testid="report-form-submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  // -- Success state --

  it('shows success message with issue link after submission', async () => {
    const onSubmit = vi.fn(async (): Promise<SubmitResult> => ({
      url: 'https://linear.app/issue/456',
      id: '456',
      success: true,
    }));

    ({ container, root } = renderForm({ onSubmit }));

    // Type title.
    const input = queryBody('[data-testid="report-form-title"]') as HTMLInputElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      nativeInputValueSetter.call(input, 'Success test');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Submit.
    await act(async () => {
      const submitBtn = queryBody('[data-testid="report-form-submit"]') as HTMLButtonElement;
      submitBtn.click();
      await new Promise((r) => setTimeout(r, 50));
    });

    const success = queryBody('[data-testid="report-form-success"]');
    expect(success).not.toBeNull();
    expect(success!.textContent).toContain('Report Submitted');

    const link = queryBody('[data-testid="report-form-issue-link"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toContain('linear.app/issue/456');
  });

  // -- Error state --

  it('shows error message on ShakeNbakeError', async () => {
    const onSubmit = vi.fn(async () => {
      throw new ShakeNbakeError(
        'Authentication failed.',
        'AUTH_FAILED',
      );
    });

    ({ container, root } = renderForm({ onSubmit }));

    // Type title.
    const input = queryBody('[data-testid="report-form-title"]') as HTMLInputElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      nativeInputValueSetter.call(input, 'Error test');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Submit.
    await act(async () => {
      const submitBtn = queryBody('[data-testid="report-form-submit"]') as HTMLButtonElement;
      submitBtn.click();
      await new Promise((r) => setTimeout(r, 50));
    });

    const errorEl = queryBody('[data-testid="report-form-error"]');
    expect(errorEl).not.toBeNull();

    const errorMsg = queryBody('[data-testid="report-form-error-message"]');
    expect(errorMsg).not.toBeNull();
    expect(errorMsg!.textContent).toContain('API key');
  });

  // -- Re-annotate --

  it('renders re-annotate button when onReAnnotate is provided', () => {
    const onReAnnotate = vi.fn();
    ({ container, root } = renderForm({ onReAnnotate }));

    const btn = queryBody('[data-testid="report-form-reannotate"]');
    expect(btn).not.toBeNull();
  });

  it('does not render re-annotate button when onReAnnotate is not provided', () => {
    ({ container, root } = renderForm({ onReAnnotate: undefined }));

    const btn = queryBody('[data-testid="report-form-reannotate"]');
    expect(btn).toBeNull();
  });

  // -- Theme --

  it('renders with dark theme by default', () => {
    ({ container, root } = renderForm());
    const modal = queryBody('[data-testid="report-form-modal"]') as HTMLElement;
    expect(modal.style.backgroundColor).toBe('rgb(30, 30, 30)');
  });

  it('renders with light theme when specified', () => {
    ({ container, root } = renderForm({ theme: 'light' }));
    const modal = queryBody('[data-testid="report-form-modal"]') as HTMLElement;
    expect(modal.style.backgroundColor).toBe('rgb(255, 255, 255)');
  });
});
