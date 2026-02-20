// ---------------------------------------------------------------------------
// @shakenbake/react-native — Report form validation
//
// Pure functions for validating report form input. Extracted so they can be
// unit-tested without React or React Native dependencies.
// ---------------------------------------------------------------------------

/**
 * Validation result for a single field.
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Validates the title field.
 * - Required (non-empty after trim)
 * - Minimum 3 characters after trim
 */
export function validateTitle(title: string): FieldError | null {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { field: 'title', message: 'Title is required' };
  }
  if (trimmed.length < 3) {
    return { field: 'title', message: 'Title must be at least 3 characters' };
  }
  return null;
}

/**
 * Validates the complete form. Returns an array of field errors (empty = valid).
 */
export function validateForm(fields: {
  title: string;
}): FieldError[] {
  const errors: FieldError[] = [];
  const titleError = validateTitle(fields.title);
  if (titleError) {
    errors.push(titleError);
  }
  return errors;
}

/**
 * Returns true if the form is valid for submission.
 */
export function isFormValid(fields: { title: string }): boolean {
  return validateForm(fields).length === 0;
}
