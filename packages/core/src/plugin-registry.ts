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
 */
export class PluginRegistry {
  private triggers: TriggerPlugin[] = [];
  private capturePlugins: CapturePlugin[] = [];
  private collectors: ContextCollector[] = [];

  // ---- Triggers ----

  registerTrigger(plugin: TriggerPlugin): void {
    this.triggers.push(plugin);
  }

  unregisterTrigger(name: string): void {
    this.triggers = this.triggers.filter((p) => p.name !== name);
  }

  getTriggers(): readonly TriggerPlugin[] {
    return this.triggers;
  }

  activateTriggers(onTrigger: () => void): void {
    for (const trigger of this.triggers) {
      trigger.activate(onTrigger);
    }
  }

  deactivateTriggers(): void {
    for (const trigger of this.triggers) {
      trigger.deactivate();
    }
  }

  // ---- Capture ----

  registerCapture(plugin: CapturePlugin): void {
    this.capturePlugins.push(plugin);
  }

  unregisterCapture(name: string): void {
    this.capturePlugins = this.capturePlugins.filter(
      (p) => p.name !== name,
    );
  }

  getCapture(): CapturePlugin | undefined {
    return this.capturePlugins[0];
  }

  // ---- Context Collectors ----

  registerCollector(collector: ContextCollector): void {
    this.collectors.push(collector);
  }

  unregisterCollector(name: string): void {
    this.collectors = this.collectors.filter((c) => c.name !== name);
  }

  getCollectors(): readonly ContextCollector[] {
    return this.collectors;
  }

  /**
   * Runs all registered collectors and deep-merges results into a
   * single Partial<DeviceContext>.
   */
  async collectContext(): Promise<Partial<DeviceContext>> {
    const results = await Promise.all(
      this.collectors.map((c) => c.collect()),
    );
    return results.reduce<Partial<DeviceContext>>((acc, partial) => {
      return deepMerge(acc, partial);
    }, {});
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
