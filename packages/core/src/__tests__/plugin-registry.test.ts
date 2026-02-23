import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '../plugin-registry.js';
import type {
  TriggerPlugin,
  CapturePlugin,
  ContextCollector,
  CaptureResult,
  DeviceContext,
} from '../types.js';

function makeTrigger(name: string): TriggerPlugin {
  return {
    name,
    platform: 'universal',
    activate: vi.fn(),
    deactivate: vi.fn(),
  };
}

function makeCapture(
  name: string,
  result?: CaptureResult,
): CapturePlugin {
  return {
    name,
    platform: 'web',
    capture: vi.fn().mockResolvedValue(
      result ?? {
        imageData: 'base64data',
        dimensions: { width: 800, height: 600 },
        mimeType: 'image/png',
      },
    ),
  };
}

function makeCollector(
  name: string,
  partial: Partial<DeviceContext>,
): ContextCollector {
  return {
    name,
    platform: 'universal',
    collect: vi.fn().mockResolvedValue(partial),
  };
}

function makeFailingCollector(name: string): ContextCollector {
  return {
    name,
    platform: 'universal',
    collect: vi.fn().mockRejectedValue(new Error('collector failed')),
  };
}

describe('PluginRegistry', () => {
  // ---- Triggers ----
  describe('triggers', () => {
    it('registers and retrieves triggers', () => {
      const registry = new PluginRegistry();
      const trigger = makeTrigger('shake');
      registry.registerTrigger(trigger);
      expect(registry.getTriggers()).toHaveLength(1);
      expect(registry.getTriggers()[0]?.name).toBe('shake');
    });

    it('unregisters a trigger by name', () => {
      const registry = new PluginRegistry();
      registry.registerTrigger(makeTrigger('shake'));
      registry.registerTrigger(makeTrigger('keyboard'));
      registry.unregisterTrigger('shake');
      expect(registry.getTriggers()).toHaveLength(1);
      expect(registry.getTriggers()[0]?.name).toBe('keyboard');
    });

    it('activates and deactivates all triggers', async () => {
      const registry = new PluginRegistry();
      const t1 = makeTrigger('shake');
      const t2 = makeTrigger('keyboard');
      registry.registerTrigger(t1);
      registry.registerTrigger(t2);

      const onTrigger = vi.fn();
      await registry.activateTriggers(onTrigger);
      expect(t1.activate).toHaveBeenCalledWith(onTrigger);
      expect(t2.activate).toHaveBeenCalledWith(onTrigger);

      registry.deactivateTriggers();
      expect(t1.deactivate).toHaveBeenCalled();
      expect(t2.deactivate).toHaveBeenCalled();
    });

    it('returns empty array when no triggers registered', () => {
      const registry = new PluginRegistry();
      expect(registry.getTriggers()).toEqual([]);
    });

    it('overwrites trigger with the same name', () => {
      const registry = new PluginRegistry();
      const t1 = makeTrigger('shake');
      const t2 = makeTrigger('shake');
      registry.registerTrigger(t1);
      registry.registerTrigger(t2);
      expect(registry.getTriggers()).toHaveLength(1);
      // The second registration should replace the first
      expect(registry.getTriggers()[0]).toBe(t2);
    });

    it('unregistering a non-existent trigger is a no-op', () => {
      const registry = new PluginRegistry();
      registry.registerTrigger(makeTrigger('shake'));
      registry.unregisterTrigger('nonexistent');
      expect(registry.getTriggers()).toHaveLength(1);
    });

    it('activateTriggers is a no-op on empty registry', async () => {
      const registry = new PluginRegistry();
      // Should not throw
      await registry.activateTriggers(vi.fn());
    });

    it('deactivateTriggers is a no-op on empty registry', () => {
      const registry = new PluginRegistry();
      // Should not throw
      registry.deactivateTriggers();
    });
  });

  // ---- Capture ----
  describe('capture', () => {
    it('returns undefined when no capture plugin is registered', () => {
      const registry = new PluginRegistry();
      expect(registry.getCapture()).toBeUndefined();
    });

    it('returns the first registered capture plugin', () => {
      const registry = new PluginRegistry();
      registry.registerCapture(makeCapture('html2canvas'));
      registry.registerCapture(makeCapture('view-shot'));
      expect(registry.getCapture()?.name).toBe('html2canvas');
    });

    it('unregisters a capture plugin by name', () => {
      const registry = new PluginRegistry();
      registry.registerCapture(makeCapture('html2canvas'));
      registry.unregisterCapture('html2canvas');
      expect(registry.getCapture()).toBeUndefined();
    });

    it('overwrites capture plugin with the same name', () => {
      const registry = new PluginRegistry();
      const c1 = makeCapture('html2canvas');
      const c2 = makeCapture('html2canvas');
      registry.registerCapture(c1);
      registry.registerCapture(c2);
      // Map overwrites, so only one entry
      expect(registry.getCapture()).toBe(c2);
    });
  });

  // ---- Collectors ----
  describe('collectors', () => {
    it('registers and retrieves collectors', () => {
      const registry = new PluginRegistry();
      const collector = makeCollector('device', {
        device: { manufacturer: 'Apple' },
      });
      registry.registerCollector(collector);
      expect(registry.getCollectors()).toHaveLength(1);
    });

    it('unregisters a collector by name', () => {
      const registry = new PluginRegistry();
      registry.registerCollector(
        makeCollector('device', { device: {} }),
      );
      registry.unregisterCollector('device');
      expect(registry.getCollectors()).toHaveLength(0);
    });

    it('merges context from multiple collectors', async () => {
      const registry = new PluginRegistry();
      registry.registerCollector(
        makeCollector('platform', {
          platform: { os: 'ios', osVersion: '17.0' },
        }),
      );
      registry.registerCollector(
        makeCollector('network', {
          network: { isConnected: true, type: 'wifi' },
        }),
      );

      const ctx = await registry.collectContext();
      expect(ctx.platform?.os).toBe('ios');
      expect(ctx.platform?.osVersion).toBe('17.0');
      expect(ctx.network?.isConnected).toBe(true);
      expect(ctx.network?.type).toBe('wifi');
    });

    it('returns empty object when no collectors are registered', async () => {
      const registry = new PluginRegistry();
      const ctx = await registry.collectContext();
      expect(ctx).toEqual({});
    });

    it('overwrites collector with the same name', () => {
      const registry = new PluginRegistry();
      const c1 = makeCollector('device', { device: { manufacturer: 'Apple' } });
      const c2 = makeCollector('device', { device: { manufacturer: 'Samsung' } });
      registry.registerCollector(c1);
      registry.registerCollector(c2);
      expect(registry.getCollectors()).toHaveLength(1);
      expect(registry.getCollectors()[0]).toBe(c2);
    });

    it('handles a failing collector gracefully without breaking others', async () => {
      const registry = new PluginRegistry();
      registry.registerCollector(
        makeCollector('platform', {
          platform: { os: 'ios' },
        }),
      );
      registry.registerCollector(makeFailingCollector('broken'));
      registry.registerCollector(
        makeCollector('network', {
          network: { isConnected: true },
        }),
      );

      const ctx = await registry.collectContext();
      // The failing collector should be skipped
      expect(ctx.platform?.os).toBe('ios');
      expect(ctx.network?.isConnected).toBe(true);
    });
  });

  // ---- Async activateTriggers ----
  describe('async activateTriggers', () => {
    it('awaits async triggers in registration order', async () => {
      const registry = new PluginRegistry();
      const callOrder: string[] = [];

      const t1: TriggerPlugin = {
        name: 'async-first',
        platform: 'universal',
        activate: vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 10));
          callOrder.push('first');
        }),
        deactivate: vi.fn(),
      };

      const t2: TriggerPlugin = {
        name: 'async-second',
        platform: 'universal',
        activate: vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 5));
          callOrder.push('second');
        }),
        deactivate: vi.fn(),
      };

      registry.registerTrigger(t1);
      registry.registerTrigger(t2);

      const onTrigger = vi.fn();
      await registry.activateTriggers(onTrigger);

      expect(t1.activate).toHaveBeenCalledWith(onTrigger);
      expect(t2.activate).toHaveBeenCalledWith(onTrigger);
      expect(callOrder).toEqual(['first', 'second']);
    });

    it('logs and continues when one trigger fails', async () => {
      const registry = new PluginRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const failing: TriggerPlugin = {
        name: 'broken-trigger',
        platform: 'universal',
        activate: vi.fn(async () => {
          throw new Error('activation boom');
        }),
        deactivate: vi.fn(),
      };

      const succeeding: TriggerPlugin = {
        name: 'good-trigger',
        platform: 'universal',
        activate: vi.fn(async () => {}),
        deactivate: vi.fn(),
      };

      registry.registerTrigger(failing);
      registry.registerTrigger(succeeding);

      const onTrigger = vi.fn();
      await registry.activateTriggers(onTrigger);

      expect(errorSpy).toHaveBeenCalledWith(
        '[PluginRegistry] Trigger "broken-trigger" activation failed:',
        expect.any(Error),
      );
      expect(succeeding.activate).toHaveBeenCalledWith(onTrigger);

      errorSpy.mockRestore();
    });

    it('handles mix of sync and async triggers', async () => {
      const registry = new PluginRegistry();

      const syncTrigger: TriggerPlugin = {
        name: 'sync-trigger',
        platform: 'universal',
        activate: vi.fn(() => {
          // returns void (synchronous)
        }),
        deactivate: vi.fn(),
      };

      const asyncTrigger: TriggerPlugin = {
        name: 'async-trigger',
        platform: 'universal',
        activate: vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 5));
        }),
        deactivate: vi.fn(),
      };

      registry.registerTrigger(syncTrigger);
      registry.registerTrigger(asyncTrigger);

      const onTrigger = vi.fn();
      await registry.activateTriggers(onTrigger);

      expect(syncTrigger.activate).toHaveBeenCalledWith(onTrigger);
      expect(asyncTrigger.activate).toHaveBeenCalledWith(onTrigger);
    });
  });

  // ---- Clear ----
  describe('clear()', () => {
    it('removes all triggers, capture plugins, and collectors', () => {
      const registry = new PluginRegistry();
      registry.registerTrigger(makeTrigger('shake'));
      registry.registerTrigger(makeTrigger('keyboard'));
      registry.registerCapture(makeCapture('html2canvas'));
      registry.registerCollector(
        makeCollector('device', { device: {} }),
      );

      registry.clear();

      expect(registry.getTriggers()).toHaveLength(0);
      expect(registry.getCapture()).toBeUndefined();
      expect(registry.getCollectors()).toHaveLength(0);
    });

    it('is safe to call clear() on an empty registry', () => {
      const registry = new PluginRegistry();
      // Should not throw
      registry.clear();
      expect(registry.getTriggers()).toHaveLength(0);
    });
  });
});
