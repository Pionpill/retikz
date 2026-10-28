// @vitest-environment jsdom
import type { Scene } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import type { HydrationContext, HydrationHandlers } from '../../src/hydration';
import {
  collectCanvasAnimationEventTriggers,
  collectCanvasVisibleAnimationIds,
  isCanvasAnimationIdVisible,
  withCanvasAnimationEventHandlers,
} from '../../src/hydration';

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
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 200,
          trigger: { onEvent: 'click' },
        },
        {
          property: 'strokeWidth',
          keyframes: [
            { at: 0, value: 1 },
            { at: 1, value: 4 },
          ],
          duration: 200,
          trigger: 'visible',
        },
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

describe('Canvas 动画触发助手', () => {
  it('从 Scene 原语收集 onEvent 和可见触发器 id', () => {
    const events = collectCanvasAnimationEventTriggers(scene);

    expect(events.get('box')?.has('click')).toBe(true);
    expect(collectCanvasVisibleAnimationIds(scene).has('box')).toBe(true);
  });

  it('合成 onEvent 处理程序，在用户处理程序之前重新启动命中 ID', () => {
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

  it('即使用户未注册，也会添加内部 onEvent 处理程序', () => {
    const restart = vi.fn();
    const merged = withCanvasAnimationEventHandlers(scene, undefined);

    merged.box.click?.(new MouseEvent('click'), context(restart));

    expect(restart).toHaveBeenCalledWith('box');
  });

  it('保留特殊键 ID，而不将动画处理程序写入 Object.prototype', () => {
    const specialId = '__proto__';
    const user = vi.fn();
    const restart = vi.fn();
    const specialScene: Scene = {
      ...scene,
      primitives: scene.primitives.map(primitive => ({ ...primitive, id: specialId })),
    };
    const handlers: HydrationHandlers = Object.fromEntries([[specialId, { click: user }]]);

    try {
      const merged = withCanvasAnimationEventHandlers(specialScene, handlers);

      expect(Object.hasOwn(merged, specialId)).toBe(true);
      expect(Object.hasOwn(Object.prototype, 'click')).toBe(false);

      merged[specialId].click?.(new MouseEvent('click'), { ...context(restart), id: specialId, scene: specialScene });

      expect(restart).toHaveBeenCalledWith(specialId);
      expect(user).toHaveBeenCalledTimes(1);
    } finally {
      delete (Object.prototype as { click?: unknown }).click;
    }
  });

  it('通过 meet-fit 映射一个 id bbox 并检测视口相交', () => {
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
