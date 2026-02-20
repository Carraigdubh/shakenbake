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

    it('activates and deactivates all triggers', () => {
      const registry = new PluginRegistry();
      const t1 = makeTrigger('shake');
      const t2 = makeTrigger('keyboard');
      registry.registerTrigger(t1);
      registry.registerTrigger(t2);

      const onTrigger = vi.fn();
      registry.activateTriggers(onTrigger);
      expect(t1.activate).toHaveBeenCalledWith(onTrigger);
      expect(t2.activate).toHaveBeenCalledWith(onTrigger);

      registry.deactivateTriggers();
      expect(t1.deactivate).toHaveBeenCalled();
      expect(t2.deactivate).toHaveBeenCalled();
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
  });
});
