// ---------------------------------------------------------------------------
// @shakenbake/react-native — ReportForm
//
// A React Native form component for composing bug reports. Rendered inside a
// Modal, it collects title, description, severity, category, and displays
// a preview of the annotated screenshot. Supports light/dark themes.
//
// Since `react-native` is a **peer dependency**, all RN components are loaded
// dynamically at runtime using the same pattern as DrawingCanvas.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import type {
  Severity,
  Category,
  ReportInput,
  SubmitResult,
  DeviceContext,
} from '@shakenbake/core';

import { validateTitle, isFormValid } from './form-validation.js';

// ---------------------------------------------------------------------------
// React Native module shape (peer dep — loaded dynamically)
// ---------------------------------------------------------------------------

interface RNModule {
  View: React.ComponentType<Record<string, unknown>>;
  Text: React.ComponentType<Record<string, unknown>>;
  TextInput: React.ComponentType<Record<string, unknown>>;
  TouchableOpacity: React.ComponentType<Record<string, unknown>>;
  ScrollView: React.ComponentType<Record<string, unknown>>;
  Modal: React.ComponentType<Record<string, unknown>>;
  Image: React.ComponentType<Record<string, unknown>>;
  ActivityIndicator: React.ComponentType<Record<string, unknown>>;
  KeyboardAvoidingView: React.ComponentType<Record<string, unknown>>;
  Platform: { OS: string };
  StyleSheet: {
    create<T extends Record<string, Record<string, unknown>>>(styles: T): T;
  };
  Linking: {
    openURL(url: string): Promise<void>;
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReportFormProps {
  /** Base64-encoded annotated screenshot */
  annotatedScreenshot: string;
  /** Base64-encoded original screenshot */
  originalScreenshot: string;
  /** Dimensions of the screenshot */
  dimensions: { width: number; height: number };
  /** Collected device context (read-only display) */
  context: Partial<DeviceContext>;
  /** Called when the user submits the form */
  onSubmit: (input: ReportInput) => Promise<SubmitResult>;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Called when the user wants to re-annotate the screenshot */
  onReAnnotate?: () => void;
  /** Light or dark theme */
  theme?: 'light' | 'dark';
  /** Accent color for primary buttons */
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

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  inputBackground: string;
  accent: string;
  error: string;
  success: string;
  buttonText: string;
  buttonGroupBg: string;
  buttonGroupActive: string;
}

function getThemeColors(
  theme: 'light' | 'dark',
  accentColor?: string,
): ThemeColors {
  const accent = accentColor ?? '#007AFF';
  if (theme === 'dark') {
    return {
      background: '#1C1C1E',
      surface: '#2C2C2E',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      border: '#3A3A3C',
      inputBackground: '#2C2C2E',
      accent,
      error: '#FF453A',
      success: '#30D158',
      buttonText: '#FFFFFF',
      buttonGroupBg: '#3A3A3C',
      buttonGroupActive: accent,
    };
  }
  return {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#6C6C70',
    border: '#C6C6C8',
    inputBackground: '#FFFFFF',
    accent,
    error: '#FF3B30',
    success: '#34C759',
    buttonText: '#FFFFFF',
    buttonGroupBg: '#E5E5EA',
    buttonGroupActive: accent,
  };
}

// ---------------------------------------------------------------------------
// Context display helpers
// ---------------------------------------------------------------------------

function formatContextSection(
  label: string,
  data: object | undefined,
): Array<{ key: string; value: string }> {
  if (!data) return [];
  const items: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== '') {
      items.push({ key: `${label}.${k}`, value: String(v) });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// ReportForm component
// ---------------------------------------------------------------------------

/**
 * Report form rendered inside a Modal. Collects user input for a bug report
 * and sends it via the provided `onSubmit` callback.
 *
 * Requires `react-native` to be available at runtime (peer dependency).
 */
export function ReportForm(props: ReportFormProps): React.ReactNode {
  const {
    annotatedScreenshot,
    originalScreenshot,
    dimensions,
    context,
    onSubmit,
    onCancel,
    onReAnnotate,
    theme = 'dark',
    accentColor,
  } = props;

  // ---- Module loading ----
  const [rn, setRn] = useState<RNModule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const mod = await import('react-native');
        if (!cancelled) setRn(mod as unknown as RNModule);
      } catch {
        if (!cancelled)
          setLoadError(
            'react-native is required for ReportForm but is not available.',
          );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Form state ----
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [category, setCategory] = useState<Category>('bug');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);

  // ---- Submission state ----
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ---- Theme ----
  const colors = useMemo(() => getThemeColors(theme, accentColor), [theme, accentColor]);

  // ---- Validate on title change ----
  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    const error = validateTitle(text);
    setTitleError(error?.message ?? null);
  }, []);

  // ---- Submit handler ----
  const handleSubmit = useCallback(async () => {
    if (!isFormValid({ title })) {
      const error = validateTitle(title);
      setTitleError(error?.message ?? null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const input: ReportInput = {
        title: title.trim(),
        description: description.trim(),
        severity,
        category,
        annotatedScreenshot,
        originalScreenshot,
      };
      const result = await onSubmit(input);
      setSubmitResult(result);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit report',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    severity,
    category,
    annotatedScreenshot,
    originalScreenshot,
    onSubmit,
  ]);

  // ---- Context items for display ----
  const contextItems = useMemo(() => {
    const items: Array<{ key: string; value: string }> = [];
    if (context.platform) items.push(...formatContextSection('Platform', context.platform));
    if (context.device) items.push(...formatContextSection('Device', context.device));
    if (context.screen) items.push(...formatContextSection('Screen', context.screen));
    if (context.network) items.push(...formatContextSection('Network', context.network));
    if (context.battery) items.push(...formatContextSection('Battery', context.battery));
    if (context.locale) items.push(...formatContextSection('Locale', context.locale));
    if (context.app) items.push(...formatContextSection('App', context.app));
    return items;
  }, [context]);

  // ---- Render: loading / error states ----

  if (loadError) {
    return React.createElement(
      'div',
      { style: { padding: 20, backgroundColor: '#1a1a1a', flex: 1 } },
      React.createElement(
        'p',
        { style: { color: '#ff6b6b', fontSize: 16 } },
        loadError,
      ),
    );
  }

  if (!rn) return null;

  const {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Linking,
  } = rn;

  // ---- Styles ----
  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardAvoid: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: colors.text,
    },
    headerButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerButtonText: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '500' as const,
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.error,
      fontWeight: '500' as const,
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 6,
      marginTop: 16,
    },
    required: {
      color: colors.error,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    inputError: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    multilineInput: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      minHeight: 80,
      textAlignVertical: 'top' as const,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
    },
    buttonGroup: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
    },
    buttonGroupItem: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.buttonGroupBg,
    },
    buttonGroupItemActive: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.buttonGroupActive,
    },
    buttonGroupText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
    },
    buttonGroupTextActive: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.buttonText,
    },
    screenshotContainer: {
      marginTop: 16,
      borderRadius: 8,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    screenshotImage: {
      width: '100%' as unknown as number,
      height: 200,
    },
    screenshotOverlay: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 6,
      alignItems: 'center' as const,
    },
    screenshotOverlayText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500' as const,
    },
    contextHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 16,
    },
    contextHeaderText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    contextToggle: {
      fontSize: 12,
      color: colors.accent,
    },
    contextRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 4,
    },
    contextKey: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
    },
    contextValue: {
      fontSize: 12,
      color: colors.text,
      flex: 1,
      textAlign: 'right' as const,
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
      marginTop: 24,
    },
    submitButtonDisabled: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
      marginTop: 24,
      opacity: 0.5,
    },
    submitButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    // ---- Success state ----
    successContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 32,
      backgroundColor: colors.background,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.success,
      marginBottom: 12,
    },
    successMessage: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: 24,
    },
    successLink: {
      color: colors.accent,
      fontSize: 14,
      textDecorationLine: 'underline' as const,
      marginBottom: 24,
    },
    doneButton: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 32,
      paddingVertical: 12,
    },
    doneButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    // ---- Error state ----
    errorBanner: {
      backgroundColor: colors.error,
      padding: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    errorBannerText: {
      color: '#FFFFFF',
      fontSize: 14,
      textAlign: 'center' as const,
    },
    // ---- Loading overlay ----
    loadingOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: 16,
      marginTop: 12,
    },
  });

  // ---- Success view ----
  if (submitResult) {
    return React.createElement(
      Modal,
      { visible: true, animationType: 'slide' },
      React.createElement(
        View,
        { style: styles.successContainer },
        React.createElement(Text, { style: styles.successTitle }, 'Report Submitted'),
        React.createElement(
          Text,
          { style: styles.successMessage },
          'Your bug report has been created successfully.',
        ),
        submitResult.url
          ? React.createElement(
              TouchableOpacity,
              {
                onPress: () => {
                  void Linking.openURL(submitResult.url);
                },
              },
              React.createElement(
                Text,
                { style: styles.successLink },
                `View issue: ${submitResult.url}`,
              ),
            )
          : null,
        React.createElement(
          TouchableOpacity,
          { style: styles.doneButton, onPress: onCancel },
          React.createElement(Text, { style: styles.doneButtonText }, 'Done'),
        ),
      ),
    );
  }

  // ---- Main form ----
  const canSubmit = isFormValid({ title }) && !submitting;

  return React.createElement(
    Modal,
    { visible: true, animationType: 'slide' },
    React.createElement(
      View,
      { style: styles.modal },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          TouchableOpacity,
          { style: styles.headerButton, onPress: onCancel, disabled: submitting },
          React.createElement(Text, { style: styles.cancelButtonText }, 'Cancel'),
        ),
        React.createElement(Text, { style: styles.headerTitle }, 'Report Bug'),
        React.createElement(
          TouchableOpacity,
          {
            style: styles.headerButton,
            onPress: () => void handleSubmit(),
            disabled: !canSubmit,
          },
          React.createElement(
            Text,
            {
              style: {
                ...styles.headerButtonText,
                ...(canSubmit ? {} : { opacity: 0.4 }),
              },
            },
            'Submit',
          ),
        ),
      ),

      React.createElement(
        KeyboardAvoidingView,
        {
          style: styles.keyboardAvoid,
          behavior: Platform.OS === 'ios' ? 'padding' : undefined,
        },
        React.createElement(
          ScrollView,
          { style: styles.container, contentContainerStyle: styles.scrollContent },

          // Screenshot preview
          React.createElement(
            TouchableOpacity,
            {
              style: styles.screenshotContainer,
              onPress: onReAnnotate,
              activeOpacity: onReAnnotate ? 0.7 : 1,
            },
            React.createElement(Image, {
              style: styles.screenshotImage,
              source: { uri: `data:image/png;base64,${annotatedScreenshot}` },
              resizeMode: 'contain',
            }),
            onReAnnotate
              ? React.createElement(
                  View,
                  { style: styles.screenshotOverlay },
                  React.createElement(
                    Text,
                    { style: styles.screenshotOverlayText },
                    'Tap to re-annotate',
                  ),
                )
              : null,
          ),

          // Title
          React.createElement(
            Text,
            { style: styles.label },
            React.createElement(Text, null, 'Title '),
            React.createElement(Text, { style: styles.required }, '*'),
          ),
          React.createElement(TextInput, {
            style: titleError ? styles.inputError : styles.input,
            value: title,
            onChangeText: handleTitleChange,
            placeholder: 'Brief description of the issue...',
            placeholderTextColor: colors.textSecondary,
            autoFocus: true,
            maxLength: 200,
            returnKeyType: 'next',
          }),
          titleError
            ? React.createElement(Text, { style: styles.errorText }, titleError)
            : null,

          // Description
          React.createElement(Text, { style: styles.label }, 'Description'),
          React.createElement(TextInput, {
            style: styles.multilineInput,
            value: description,
            onChangeText: setDescription,
            placeholder: 'Steps to reproduce, expected vs actual behavior...',
            placeholderTextColor: colors.textSecondary,
            multiline: true,
            numberOfLines: 4,
            maxLength: 2000,
          }),

          // Severity
          React.createElement(Text, { style: styles.label }, 'Severity'),
          React.createElement(
            View,
            { style: styles.buttonGroup },
            ...SEVERITIES.map((s) =>
              React.createElement(
                TouchableOpacity,
                {
                  key: s,
                  style:
                    s === severity
                      ? styles.buttonGroupItemActive
                      : styles.buttonGroupItem,
                  onPress: () => setSeverity(s),
                },
                React.createElement(
                  Text,
                  {
                    style:
                      s === severity
                        ? styles.buttonGroupTextActive
                        : styles.buttonGroupText,
                  },
                  SEVERITY_LABELS[s],
                ),
              ),
            ),
          ),

          // Category
          React.createElement(Text, { style: styles.label }, 'Category'),
          React.createElement(
            View,
            { style: styles.buttonGroup },
            ...CATEGORIES.map((c) =>
              React.createElement(
                TouchableOpacity,
                {
                  key: c,
                  style:
                    c === category
                      ? styles.buttonGroupItemActive
                      : styles.buttonGroupItem,
                  onPress: () => setCategory(c),
                },
                React.createElement(
                  Text,
                  {
                    style:
                      c === category
                        ? styles.buttonGroupTextActive
                        : styles.buttonGroupText,
                  },
                  CATEGORY_LABELS[c],
                ),
              ),
            ),
          ),

          // Device context (collapsible)
          contextItems.length > 0
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  TouchableOpacity,
                  {
                    style: styles.contextHeader,
                    onPress: () => setContextExpanded(!contextExpanded),
                  },
                  React.createElement(
                    Text,
                    { style: styles.contextHeaderText },
                    'Device Context',
                  ),
                  React.createElement(
                    Text,
                    { style: styles.contextToggle },
                    contextExpanded ? 'Hide' : 'Show',
                  ),
                ),
                contextExpanded
                  ? React.createElement(
                      View,
                      null,
                      ...contextItems.map((item) =>
                        React.createElement(
                          View,
                          { key: item.key, style: styles.contextRow },
                          React.createElement(
                            Text,
                            { style: styles.contextKey },
                            item.key,
                          ),
                          React.createElement(
                            Text,
                            { style: styles.contextValue, numberOfLines: 1 },
                            item.value,
                          ),
                        ),
                      ),
                    )
                  : null,
              )
            : null,

          // Error banner
          submitError
            ? React.createElement(
                View,
                { style: styles.errorBanner },
                React.createElement(
                  Text,
                  { style: styles.errorBannerText },
                  submitError,
                ),
              )
            : null,

          // Submit button
          React.createElement(
            TouchableOpacity,
            {
              style: canSubmit
                ? styles.submitButton
                : styles.submitButtonDisabled,
              onPress: () => void handleSubmit(),
              disabled: !canSubmit,
            },
            React.createElement(
              Text,
              { style: styles.submitButtonText },
              submitting ? 'Submitting...' : 'Submit Report',
            ),
          ),
        ),
      ),

      // Loading overlay
      submitting
        ? React.createElement(
            View,
            { style: styles.loadingOverlay, pointerEvents: 'auto' },
            React.createElement(ActivityIndicator, {
              size: 'large',
              color: '#FFFFFF',
            }),
            React.createElement(
              Text,
              { style: styles.loadingText },
              'Submitting report...',
            ),
          )
        : null,
    ),
  );
}
