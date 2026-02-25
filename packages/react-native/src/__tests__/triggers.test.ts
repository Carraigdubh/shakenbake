// ---------------------------------------------------------------------------
// Tests for ShakeTrigger
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockNativeShakePresent = true;
vi.mock('react-native', () => ({
  NativeModules: {
    get RNShake() {
      return mockNativeShakePresent ? {} : null;
    },
  },
  TurboModuleRegistry: {
    get: vi.fn(() => (mockNativeShakePresent ? {} : null)),
  },
}));

// Mock react-native-shake before importing ShakeTrigger
const mockRemove = vi.fn();
const mockAddListener = vi.fn(() => ({ remove: mockRemove }));

vi.mock('react-native-shake', () => ({
  default: {
    addListener: mockAddListener,
  },
}));

// Import after mocks are set up
import { ShakeTrigger } from '../triggers/shake.js';

describe('ShakeTrigger', () => {
  let trigger: ShakeTrigger;

  beforeEach(() => {
    trigger = new ShakeTrigger();
    vi.clearAllMocks();
    mockNativeShakePresent = true;
  });

  it('has correct name and platform', () => {
    expect(trigger.name).toBe('shake');
    expect(trigger.platform).toBe('react-native');
  });

  it('registers a listener on activate', async () => {
    const onTrigger = vi.fn();
    await trigger.activate(onTrigger);

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener).toHaveBeenCalledWith(onTrigger);
  });

  it('removes the listener on deactivate', async () => {
    const onTrigger = vi.fn();
    await trigger.activate(onTrigger);
    trigger.deactivate();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('does nothing on deactivate if not activated', () => {
    // Should not throw
    trigger.deactivate();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('cleans up subscription reference after deactivate', async () => {
    const onTrigger = vi.fn();
    await trigger.activate(onTrigger);
    trigger.deactivate();

    // Second deactivate should not call remove again
    trigger.deactivate();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('skips registration when native RNShake module is unavailable', async () => {
    mockNativeShakePresent = false;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onTrigger = vi.fn();

    await trigger.activate(onTrigger);

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
