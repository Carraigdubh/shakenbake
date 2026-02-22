// ---------------------------------------------------------------------------
// @shakenbake/core — Context redaction utility
// Removes fields from a DeviceContext partial based on dot-path patterns.
// ---------------------------------------------------------------------------

import type { DeviceContext } from './types.js';

/**
 * Redact fields from a context object based on dot-path patterns.
 *
 * Supported patterns:
 * - `"app.url"` — removes the `url` key from the `app` section
 * - `"console"` — removes the entire `console` section
 * - `"network.*"` — removes all keys in the `network` section
 *
 * Returns a new object; the original is not mutated.
 */
export function redactContext(
  context: Partial<DeviceContext>,
  fields: string[],
): Partial<DeviceContext> {
  if (!fields.length) return context;

  // Deep-clone to avoid mutating the original.
  const result = JSON.parse(JSON.stringify(context)) as Record<string, unknown>;

  for (const field of fields) {
    const parts = field.split('.');

    if (parts.length === 1) {
      // Top-level key: e.g. "console" — delete entire section.
      delete result[parts[0]!];
    } else if (parts.length === 2 && parts[1] === '*') {
      // Wildcard: e.g. "network.*" — replace section with empty object.
      if (parts[0]! in result) {
        result[parts[0]!] = {};
      }
    } else if (parts.length === 2) {
      // Nested key: e.g. "app.url" — delete specific field.
      const section = result[parts[0]!];
      if (section && typeof section === 'object' && !Array.isArray(section)) {
        delete (section as Record<string, unknown>)[parts[1]!];
      }
    }
  }

  return result as Partial<DeviceContext>;
}
