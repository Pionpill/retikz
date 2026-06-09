// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '@retikz/core';
import {
  type HydrationContext,
  type HydrationHandlers,
  collectCanvasAnimationEventTriggers,
  collectCanvasVisibleAnimationIds,
  isCanvasAnimationIdVisible,
  withCanvasAnimationEventHandlers,
} from '../src/hydration';

const scene: Scene = {
  layout: { x: 0, y: 0, width: 100, height: 100 },
  primitives: [
    {
      type: 'rect',
      id: 'box',
      x: 10,
      y: 10,
      width: 30,
      height: 20,
      fill: '#0a0',
      animations: [
        { property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 200, trigger: { onEvent: 'click' } },
        { property: 'strokeWidth', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 4 }], duration: 200, trigger: 'visible' },
      ],
    },
  ],
};

const context = (restart: (id?: string) => void): HydrationContext => ({
  id: 'box',
  renderer: 'canvas',
  element: null,
  root: document.createElement('canvas'),
  point: null,
  animation: {
    play: () => undefined,
    pause: () => undefined,
    restart,
    stop: () => undefined,
    seek: () => undefined,
  },
  scene,
});

describe('Canvas animation trigger helpers', () => {
  it('collects onEvent and visible trigger ids from Scene primitives', () => {
    const events = collectCanvasAnimationEventTriggers(scene);
    expect(events.get('box')?.has('click')).toBe(true);
    expect(collectCanvasVisibleAnimationIds(scene).has('box')).toBe(true);
  });

  it('synthesizes onEvent handlers that restart the hit id before user handler', () => {
    const order: Array<string> = [];
    const restart = vi.fn(() => order.push('restart'));
    const user = vi.fn(() => order.push('user'));
    const handlers: HydrationHandlers = { box: { click: user } };
    const merged = withCanvasAnimationEventHandlers(scene, handlers);

    merged.box.click?.(new MouseEvent('click'), context(restart));

    expect(restart).toHaveBeenCalledWith('box');
    expect(user).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['restart', 'user']);
  });

  it('adds an internal onEvent handler even when the user registered none', () => {
    const restart = vi.fn();
    const merged = withCanvasAnimationEventHandlers(scene, undefined);

    merged.box.click?.(new MouseEvent('click'), context(restart));

    expect(restart).toHaveBeenCalledWith('box');
  });

  it('maps an id bbox through meet-fit and detects viewport intersection', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(80);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(80);

    expect(isCanvasAnimationIdVisible(canvas, scene, 'box')).toBe(true);
  });
});
