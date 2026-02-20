// ---------------------------------------------------------------------------
// Tests for ReportForm — module exports, validation logic, type shapes
//
// Since we cannot render React Native components in a vitest/node
// environment, we focus on:
// 1. Module exports are correctly shaped
// 2. Pure validation logic (form-validation.ts)
// 3. ReportFormProps type shapes compile correctly
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
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
  Linking: {
    openURL: vi.fn(),
  },
  Alert: {
    alert: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { ReportForm } from '../ui/ReportForm.js';
import type { ReportFormProps } from '../ui/ReportForm.js';
import {
  validateTitle,
  validateForm,
  isFormValid,
} from '../ui/form-validation.js';
import type { FieldError } from '../ui/form-validation.js';

// ---------------------------------------------------------------------------
// 1. Module exports
// ---------------------------------------------------------------------------

describe('ReportForm module exports', () => {
  it('ReportForm is a function component', () => {
    expect(typeof ReportForm).toBe('function');
  });

  it('re-exports from index', async () => {
    const index = await import('../index.js');
    expect(typeof index.ReportForm).toBe('function');
    expect(typeof index.validateTitle).toBe('function');
    expect(typeof index.validateForm).toBe('function');
    expect(typeof index.isFormValid).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 2. Form validation — validateTitle
// ---------------------------------------------------------------------------

describe('validateTitle', () => {
  it('returns error for empty string', () => {
    const error = validateTitle('');
    expect(error).not.toBeNull();
    expect(error!.field).toBe('title');
    expect(error!.message).toBe('Title is required');
  });

  it('returns error for whitespace-only string', () => {
    const error = validateTitle('   ');
    expect(error).not.toBeNull();
    expect(error!.field).toBe('title');
    expect(error!.message).toBe('Title is required');
  });

  it('returns error for 1-2 character string', () => {
    expect(validateTitle('ab')).not.toBeNull();
    expect(validateTitle('ab')!.message).toBe('Title must be at least 3 characters');
  });

  it('returns error for 2 chars after trim', () => {
    const error = validateTitle('  ab  ');
    expect(error).not.toBeNull();
    expect(error!.message).toBe('Title must be at least 3 characters');
  });

  it('returns null for exactly 3 characters', () => {
    expect(validateTitle('abc')).toBeNull();
  });

  it('returns null for longer strings', () => {
    expect(validateTitle('This is a valid title')).toBeNull();
  });

  it('returns null for 3 chars with surrounding whitespace', () => {
    expect(validateTitle('  abc  ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Form validation — validateForm
// ---------------------------------------------------------------------------

describe('validateForm', () => {
  it('returns empty array for valid form', () => {
    const errors = validateForm({ title: 'Valid title' });
    expect(errors).toHaveLength(0);
  });

  it('returns array with title error for empty title', () => {
    const errors = validateForm({ title: '' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('title');
  });

  it('returns array with title error for short title', () => {
    const errors = validateForm({ title: 'ab' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('title');
  });
});

// ---------------------------------------------------------------------------
// 4. Form validation — isFormValid
// ---------------------------------------------------------------------------

describe('isFormValid', () => {
  it('returns true for valid title', () => {
    expect(isFormValid({ title: 'Valid title' })).toBe(true);
  });

  it('returns false for empty title', () => {
    expect(isFormValid({ title: '' })).toBe(false);
  });

  it('returns false for short title', () => {
    expect(isFormValid({ title: 'ab' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Type shape validation (compile-time)
// ---------------------------------------------------------------------------

describe('ReportFormProps type shape', () => {
  it('can construct a valid ReportFormProps object', () => {
    const mockSubmit = vi.fn().mockResolvedValue({
      url: 'https://linear.app/issue/123',
      id: '123',
      success: true,
    });
    const mockCancel = vi.fn();

    const props: ReportFormProps = {
      annotatedScreenshot: 'base64data',
      originalScreenshot: 'base64data',
      dimensions: { width: 390, height: 844 },
      context: {
        platform: { os: 'ios' },
        device: { model: 'iPhone 15' },
      },
      onSubmit: mockSubmit,
      onCancel: mockCancel,
      onReAnnotate: vi.fn(),
      theme: 'dark',
      accentColor: '#007AFF',
    };

    expect(props.annotatedScreenshot).toBe('base64data');
    expect(props.dimensions.width).toBe(390);
    expect(props.theme).toBe('dark');
  });

  it('accepts minimal props (optional fields omitted)', () => {
    const props: ReportFormProps = {
      annotatedScreenshot: 'base64data',
      originalScreenshot: 'base64data',
      dimensions: { width: 390, height: 844 },
      context: {},
      onSubmit: vi.fn().mockResolvedValue({ url: '', id: '', success: true }),
      onCancel: vi.fn(),
    };

    expect(props.theme).toBeUndefined();
    expect(props.onReAnnotate).toBeUndefined();
    expect(props.accentColor).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 6. FieldError type shape
// ---------------------------------------------------------------------------

describe('FieldError type shape', () => {
  it('has field and message properties', () => {
    const error: FieldError = { field: 'title', message: 'Title is required' };
    expect(error.field).toBe('title');
    expect(error.message).toBe('Title is required');
  });
});
