// ---------------------------------------------------------------------------
// @shakenbake/core — PluginRegistry
// ---------------------------------------------------------------------------

import type {
  TriggerPlugin,
  CapturePlugin,
  ContextCollector,
  DeviceContext,
} from './types.js';

/**
 * Manages plugin lifecycle: registration, activation, and context collection.
 *
 * Internal storage uses Maps keyed by plugin name to prevent duplicates.
 * Registering a plugin with the same name as an existing one overwrites it.
 */
export class PluginRegistry {
  private readonly triggerMap = new Map<string, TriggerPlugin>();
  private readonly captureMap = new Map<string, CapturePlugin>();
  private readonly collectorMap = new Map<string, ContextCollector>();

  // ---- Triggers ----

  registerTrigger(plugin: TriggerPlugin): void {
    this.triggerMap.set(plugin.name, plugin);
  }

  unregisterTrigger(name: string): void {
    this.triggerMap.delete(name);
  }

  getTriggers(): TriggerPlugin[] {
    return Array.from(this.triggerMap.values());
  }

  activateTriggers(onTrigger: () => void): void {
    for (const trigger of this.triggerMap.values()) {
      trigger.activate(onTrigger);
    }
  }

  deactivateTriggers(): void {
    for (const trigger of this.triggerMap.values()) {
      trigger.deactivate();
    }
  }

  // ---- Capture ----

  registerCapture(plugin: CapturePlugin): void {
    this.captureMap.set(plugin.name, plugin);
  }

  unregisterCapture(name: string): void {
    this.captureMap.delete(name);
  }

  getCapture(): CapturePlugin | undefined {
    // Return the first registered capture plugin (insertion order).
    const first = this.captureMap.values().next();
    return first.done ? undefined : first.value;
  }

  // ---- Context Collectors ----

  registerCollector(collector: ContextCollector): void {
    this.collectorMap.set(collector.name, collector);
  }

  unregisterCollector(name: string): void {
    this.collectorMap.delete(name);
  }

  getCollectors(): ContextCollector[] {
    return Array.from(this.collectorMap.values());
  }

  /**
   * Runs all registered collectors and deep-merges results into a
   * single Partial<DeviceContext>.
   *
   * Each collector is wrapped in a try/catch so a single failing
   * collector does not prevent the others from contributing.
   */
  async collectContext(): Promise<Partial<DeviceContext>> {
    const results: Array<Partial<DeviceContext>> = [];

    for (const collector of this.collectorMap.values()) {
      try {
        const partial = await collector.collect();
        results.push(partial);
      } catch {
        // Swallow error — a failing collector should not block the rest.
      }
    }

    return results.reduce<Partial<DeviceContext>>((acc, partial) => {
      return deepMerge(acc, partial);
    }, {});
  }

  // ---- Bulk ----

  /**
   * Removes all registered plugins (triggers, capture, collectors).
   */
  clear(): void {
    this.triggerMap.clear();
    this.captureMap.clear();
    this.collectorMap.clear();
  }
}

// ---------------------------------------------------------------------------
// Utility: deep-merge two plain objects (no array concat — last wins).
// ---------------------------------------------------------------------------

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    const srcVal = (source as Record<string, unknown>)[key];
    const tgtVal = output[key];
    if (
      isPlainObject(tgtVal) &&
      isPlainObject(srcVal)
    ) {
      output[key] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else {
      output[key] = srcVal;
    }
  }
  return output as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
