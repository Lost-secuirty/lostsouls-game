import { beforeEach, describe, expect, it } from 'vitest';

function installInputGlobals() {
  const listeners = {};
  globalThis.addEventListener = (type, handler) => {
    listeners[type] ||= [];
    listeners[type].push(handler);
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: { getGamepads: () => [] },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: { innerWidth: 800, innerHeight: 600 },
    configurable: true,
  });
  return {
    fire(type, event) {
      for (const handler of listeners[type] || []) handler(event);
    },
  };
}

function makeDom() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, handler) {
      listeners[type] ||= [];
      listeners[type].push(handler);
    },
    contains() {
      return false;
    },
  };
}

describe('input proof controls', () => {
  let events;
  let Input;

  beforeEach(async () => {
    events = installInputGlobals();
    Input = (await import('../src/systems/input.js')).Input;
  });

  it('proves keyup releases movement keys so stuck-key regressions fail', () => {
    const input = new Input(makeDom());
    events.fire('keydown', { key: 'd', target: { tagName: 'BODY' } });
    expect(input.move()).toEqual({ x: 1, z: 0 });

    events.fire('keyup', { key: 'd' });
    expect(input.move()).toEqual({ x: 0, z: 0 });
  });

  it('proves clicking outside the canvas clears held input', () => {
    const dom = makeDom();
    const input = new Input(dom);
    events.fire('keydown', { key: 'w', target: { tagName: 'BODY' } });
    expect(input.move()).toEqual({ x: 0, z: -1 });

    events.fire('pointerdown', { target: { tagName: 'BUTTON' } });
    expect(input.move()).toEqual({ x: 0, z: 0 });
  });
});
