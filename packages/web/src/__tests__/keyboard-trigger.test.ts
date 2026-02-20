import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardTrigger } from '../triggers/keyboard.js';

describe('KeyboardTrigger', () => {
  let trigger: KeyboardTrigger;

  beforeEach(() => {
    trigger = new KeyboardTrigger();
  });

  afterEach(() => {
    trigger.deactivate();
  });

  it('has correct name and platform', () => {
    expect(trigger.name).toBe('keyboard');
    expect(trigger.platform).toBe('web');
  });

  it('activate registers a keydown listener on document', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const callback = vi.fn();

    trigger.activate(callback);

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addSpy.mockRestore();
  });

  it('fires onTrigger on Ctrl+Shift+K', () => {
    const callback = vi.fn();
    trigger.activate(callback);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fires onTrigger on Meta+Shift+K when userAgent contains Mac', () => {
    // jsdom's userAgent typically does not contain 'Mac', so we override it.
    const originalUA = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    });

    const callback = vi.fn();
    trigger.activate(callback);

    const event = new KeyboardEvent('keydown', {
      key: 'K',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);

    // Restore.
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    });
  });

  it('does not fire on Shift+K without modifier', () => {
    const callback = vi.fn();
    trigger.activate(callback);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not fire on Ctrl+K without Shift', () => {
    const callback = vi.fn();
    trigger.activate(callback);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not fire on Ctrl+Shift+J (wrong key)', () => {
    const callback = vi.fn();
    trigger.activate(callback);

    const event = new KeyboardEvent('keydown', {
      key: 'j',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('calls preventDefault and stopPropagation on trigger', () => {
    const callback = vi.fn();
    trigger.activate(callback);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    const stopSpy = vi.spyOn(event, 'stopPropagation');

    document.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('deactivate removes the listener', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const callback = vi.fn();

    trigger.activate(callback);
    trigger.deactivate();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    // Firing the shortcut after deactivation should not invoke callback.
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
    removeSpy.mockRestore();
  });

  it('deactivate is safe to call when not activated', () => {
    // Should not throw.
    expect(() => trigger.deactivate()).not.toThrow();
  });

  it('calling activate twice replaces the previous listener', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    trigger.activate(callback1);
    trigger.activate(callback2);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
