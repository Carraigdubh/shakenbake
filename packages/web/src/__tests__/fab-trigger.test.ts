import { describe, it, expect, vi, afterEach } from 'vitest';
import { FABTrigger } from '../triggers/fab.js';

describe('FABTrigger', () => {
  afterEach(() => {
    // Clean up any leftover buttons.
    document.body.innerHTML = '';
  });

  it('has correct name and platform', () => {
    const trigger = new FABTrigger();
    expect(trigger.name).toBe('fab');
    expect(trigger.platform).toBe('web');
  });

  it('activate creates a button in the DOM', () => {
    const trigger = new FABTrigger();
    trigger.activate(vi.fn());

    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Report a bug');
  });

  it('button is positioned fixed at bottom-right by default', () => {
    const trigger = new FABTrigger();
    trigger.activate(vi.fn());

    const btn = document.querySelector('button') as HTMLButtonElement;
    expect(btn.style.position).toBe('fixed');
    expect(btn.style.bottom).toBe('20px');
    expect(btn.style.right).toBe('20px');
  });

  it('button is positioned at bottom-left when configured', () => {
    const trigger = new FABTrigger({ position: 'bottom-left' });
    trigger.activate(vi.fn());

    const btn = document.querySelector('button') as HTMLButtonElement;
    expect(btn.style.position).toBe('fixed');
    expect(btn.style.bottom).toBe('20px');
    expect(btn.style.left).toBe('20px');
  });

  it('clicking the button fires onTrigger', () => {
    const callback = vi.fn();
    const trigger = new FABTrigger();
    trigger.activate(callback);

    const btn = document.querySelector('button') as HTMLButtonElement;
    btn.click();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('deactivate removes the button from the DOM', () => {
    const trigger = new FABTrigger();
    trigger.activate(vi.fn());

    expect(document.querySelectorAll('button').length).toBe(1);

    trigger.deactivate();

    expect(document.querySelectorAll('button').length).toBe(0);
  });

  it('deactivate is safe to call when not activated', () => {
    const trigger = new FABTrigger();
    expect(() => trigger.deactivate()).not.toThrow();
  });

  it('calling activate twice replaces the previous button', () => {
    const trigger = new FABTrigger();
    trigger.activate(vi.fn());
    trigger.activate(vi.fn());

    expect(document.querySelectorAll('button').length).toBe(1);
  });

  it('button contains an SVG icon', () => {
    const trigger = new FABTrigger();
    trigger.activate(vi.fn());

    const btn = document.querySelector('button') as HTMLButtonElement;
    const svg = btn.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('button has a high z-index', () => {
    const trigger = new FABTrigger();
    trigger.activate(vi.fn());

    const btn = document.querySelector('button') as HTMLButtonElement;
    expect(Number(btn.style.zIndex)).toBeGreaterThanOrEqual(2147483647);
  });
});
