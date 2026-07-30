import type { GroupPrim, IRAnimationTrack, RectPrim, Scene, ScenePrimitive } from '@retikz/core';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createClock,
  prefersReducedMotion,
  resolveAnimationEnabled,
  sceneAnimationDurationMs,
  sceneHasAnimations,
  sceneHasAutoplayTrigger,
} from '../../src/animation/runtime';

/**
 * animation/runtime 纯逻辑锁定测试：scene 动画存在性 / 自动播放判定 / 总时长聚合（递归 group + 根镜头），
 * prefers-reduced-motion 读取与缺失降级，createClock 在无 requestAnimationFrame（SSR）下的同步定格行为。
 * 不触真 rAF / IntersectionObserver；只钉可纯函数化的部分
 */

const layout = { x: 0, y: 0, width: 100, height: 100 };
const scene = (primitives: Array<ScenePrimitive>, animations?: Array<IRAnimationTrack>): Scene => ({
  primitives,
  layout,
  ...(animations ? { animations } : {}),
});
const rect = (extra: Partial<RectPrim> = {}): RectPrim => ({
  type: 'rect',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  fill: '#f00',
  ...extra,
});
const group = (children: Array<ScenePrimitive>, extra: Partial<GroupPrim> = {}): GroupPrim => ({
  type: 'group',
  children,
  ...extra,
});
const track = (extra: Partial<IRAnimationTrack> = {}): IRAnimationTrack => ({
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 400,
  ...extra,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sceneHasAnimations', () => {
  it('无任何动画 → false', () => {
    expect(sceneHasAnimations(scene([rect()]))).toBe(false);
  });

  it('元素级 track → true', () => {
    expect(sceneHasAnimations(scene([rect({ animations: [track()] })]))).toBe(true);
  });

  it('嵌套 group 子元素动画 → 递归命中 true', () => {
    expect(sceneHasAnimations(scene([group([group([rect({ animations: [track()] })])])]))).toBe(true);
  });

  it('scene 根镜头 track（无元素动画）→ true', () => {
    expect(sceneHasAnimations(scene([rect()], [track({ property: 'viewBox' })]))).toBe(true);
  });

  it('空 animations 数组不算动画 → false', () => {
    expect(sceneHasAnimations(scene([rect({ animations: [] })], []))).toBe(false);
  });
});

describe('sceneHasAutoplayTrigger', () => {
  it('trigger 缺省 → 自动播放 true', () => {
    expect(sceneHasAutoplayTrigger(scene([rect({ animations: [track()] })]))).toBe(true);
  });

  it('trigger=load → 自动播放 true', () => {
    expect(sceneHasAutoplayTrigger(scene([rect({ animations: [track({ trigger: 'load' })] })]))).toBe(true);
  });

  it('全为 visible / manual / onEvent → 不自动播 false', () => {
    const s = scene([
      rect({ animations: [track({ trigger: 'visible' })] }),
      rect({ animations: [track({ trigger: 'manual' })] }),
      rect({ animations: [track({ trigger: { onEvent: 'click' } })] }),
    ]);
    expect(sceneHasAutoplayTrigger(s)).toBe(false);
  });

  it('混入一个 load → true', () => {
    const s = scene([
      rect({ animations: [track({ trigger: 'manual' })] }),
      rect({ animations: [track({ trigger: 'load' })] }),
    ]);
    expect(sceneHasAutoplayTrigger(s)).toBe(true);
  });

  it('group 内自动播放 track → 递归命中 true', () => {
    expect(sceneHasAutoplayTrigger(scene([group([rect({ animations: [track()] })])]))).toBe(true);
  });

  it('根镜头自动播放 track → true', () => {
    expect(sceneHasAutoplayTrigger(scene([rect()], [track({ property: 'viewBox' })]))).toBe(true);
  });
});

describe('sceneAnimationDurationMs', () => {
  it('无 track → 0', () => {
    expect(sceneAnimationDurationMs(scene([rect()]))).toBe(0);
  });

  it('单 track → delay + duration × iterations', () => {
    expect(sceneAnimationDurationMs(scene([rect({ animations: [track({ duration: 400 })] })]))).toBe(400);
  });

  it('delay + 多次迭代叠加', () => {
    expect(
      sceneAnimationDurationMs(scene([rect({ animations: [track({ duration: 200, delay: 100, iterations: 3 })] })])),
    ).toBe(700);
  });

  it('多 track 取最大结束时刻（元素级 + 根镜头）', () => {
    const s = scene(
      [rect({ animations: [track({ duration: 300 })] })],
      [track({ property: 'viewBox', duration: 100, delay: 800 })],
    );
    expect(sceneAnimationDurationMs(s)).toBe(900);
  });

  it('任一 infinite iterations → null（持续播放）', () => {
    expect(sceneAnimationDurationMs(scene([rect({ animations: [track({ iterations: 'infinite' })] })]))).toBeNull();
  });
});

describe('prefersReducedMotion', () => {
  it('matchMedia 命中 reduce → true', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it('matchMedia 不命中 → false', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it('无 matchMedia（SSR）→ 降级 false', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('resolveAnimationEnabled', () => {
  it('未显式配置时跟随系统偏好', () => {
    expect(resolveAnimationEnabled(undefined, false)).toBe(true);
    expect(resolveAnimationEnabled(undefined, true)).toBe(false);
  });

  it('显式 true 覆盖减少动态效果偏好', () => {
    expect(resolveAnimationEnabled(true, true)).toBe(true);
  });

  it('显式 false 覆盖系统默认开启', () => {
    expect(resolveAnimationEnabled(false, false)).toBe(false);
  });
});

describe('createClock（无 requestAnimationFrame：SSR 降级）', () => {
  it('有限时长 autoplay → 同步定格末帧', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);
    const frames: Array<number> = [];
    createClock({ onFrame: t => frames.push(t), durationMs: 500, autoplay: true });
    expect(frames).toEqual([500]);
  });

  it('无限时长 autoplay → 同步定格起点 0', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const frames: Array<number> = [];
    createClock({ onFrame: t => frames.push(t), durationMs: null, autoplay: true });
    expect(frames).toEqual([0]);
  });

  it('非 autoplay → 不画帧；running 初始 false', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const frames: Array<number> = [];
    const clock = createClock({ onFrame: t => frames.push(t), durationMs: 500 });
    expect(frames).toEqual([]);
    expect(clock.running).toBe(false);
  });

  it('seek 直接画该帧并更新 time（不依赖 rAF）', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const frames: Array<number> = [];
    const clock = createClock({ onFrame: t => frames.push(t), durationMs: 500 });
    clock.seek(123);
    expect(frames).toEqual([123]);
    expect(clock.time).toBe(123);
  });

  it('无 rAF 时 play 不进入 running 态（无法逐帧推进）', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const clock = createClock({ onFrame: () => undefined, durationMs: 500 });
    clock.play();
    expect(clock.running).toBe(false);
  });
});

describe('createClock rAF lifecycle', () => {
  it('frame callback 同步 dispose 后不再续接 rAF', () => {
    let frameSequence = 0;
    const pendingFrames = new Map<number, () => void>();
    const requestFrame = vi.fn((callback: () => void) => {
      const frame = ++frameSequence;
      pendingFrames.set(frame, callback);
      return frame;
    });
    const cancelFrame = vi.fn((frame: number) => pendingFrames.delete(frame));
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const clock = createClock({
      durationMs: null,
      onFrame: () => clock.dispose(),
    });
    clock.play();
    const frame = requestFrame.mock.results[0]?.value;
    if (frame === undefined) throw new Error('expected pending clock frame');
    const callback = pendingFrames.get(frame);
    if (callback === undefined) throw new Error('expected pending clock callback');

    pendingFrames.delete(frame);
    callback();

    expect(clock.running).toBe(false);
    expect(pendingFrames.size).toBe(0);
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });

  it.each(['play', 'tick'] as const)('requestAnimationFrame 在 %s 注册中同步 dispose 不遗留返回 frame', phase => {
    let frameSequence = 0;
    let disposeDuringRequest = phase === 'play';
    const controlsRef: { current?: ReturnType<typeof createClock> } = {};
    const pendingFrames = new Map<number, () => void>();
    const requestFrame = vi.fn((callback: () => void) => {
      const frame = ++frameSequence;
      if (disposeDuringRequest) {
        disposeDuringRequest = false;
        controlsRef.current?.dispose();
      }
      pendingFrames.set(frame, callback);
      return frame;
    });
    const cancelFrame = vi.fn((frame: number) => pendingFrames.delete(frame));
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const clock = createClock({ durationMs: null, onFrame: () => undefined });
    controlsRef.current = clock;
    clock.play();
    if (phase === 'tick') {
      const firstFrame = requestFrame.mock.results[0]?.value;
      if (firstFrame === undefined) throw new Error('expected initial clock frame');
      const firstCallback = pendingFrames.get(firstFrame);
      if (firstCallback === undefined) throw new Error('expected initial clock callback');
      pendingFrames.delete(firstFrame);
      disposeDuringRequest = true;
      firstCallback();
    }

    expect(clock.running).toBe(false);
    expect(pendingFrames.size).toBe(0);
    expect(cancelFrame).toHaveBeenCalledTimes(1);
  });

  it('pause 中 cancelAnimationFrame 同步执行当前 callback 不续接新 frame', () => {
    let frameSequence = 0;
    const pendingFrames = new Map<number, () => void>();
    const requestFrame = vi.fn((callback: () => void) => {
      const frame = ++frameSequence;
      pendingFrames.set(frame, callback);
      return frame;
    });
    const cancelFrame = vi.fn((frame: number) => {
      const callback = pendingFrames.get(frame);
      pendingFrames.delete(frame);
      callback?.();
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const onFrame = vi.fn();
    const clock = createClock({ durationMs: null, onFrame });
    clock.play();

    clock.pause();

    expect(clock.running).toBe(false);
    expect(onFrame).not.toHaveBeenCalled();
    expect(pendingFrames.size).toBe(0);
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });

  it('pause 取消同步消费 callback 后抛错时恢复可推进 frame', () => {
    let frameSequence = 0;
    let rejectCancel = true;
    const pendingFrames = new Map<number, () => void>();
    const requestFrame = vi.fn((callback: () => void) => {
      const frame = ++frameSequence;
      pendingFrames.set(frame, callback);
      return frame;
    });
    const cancelFrame = vi.fn((frame: number) => {
      const callback = pendingFrames.get(frame);
      pendingFrames.delete(frame);
      callback?.();
      if (rejectCancel) {
        rejectCancel = false;
        throw new Error('pause cancel rejected after callback');
      }
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const onFrame = vi.fn();
    const clock = createClock({ durationMs: null, onFrame });
    clock.play();

    expect(() => clock.pause()).toThrow('pause cancel rejected after callback');

    expect(clock.running).toBe(true);
    expect(onFrame).not.toHaveBeenCalled();
    expect(requestFrame).toHaveBeenCalledTimes(2);
    expect(pendingFrames.size).toBe(1);
    expect(pendingFrames.has(2)).toBe(true);
    expect(() => clock.dispose()).not.toThrow();
    expect(pendingFrames.size).toBe(0);
  });

  it('dispose 成功后 play 与 seek 不再复活动画 clock', () => {
    let frameSequence = 0;
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn();
    const onFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const clock = createClock({ durationMs: null, onFrame });
    clock.play();

    clock.dispose();
    clock.play();
    clock.seek(100);

    expect(clock.running).toBe(false);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(onFrame).not.toHaveBeenCalled();
  });

  it('dispose 取消失败后 controls 失活且后续 dispose 重试同一 frame', () => {
    let frameSequence = 0;
    let rejectCancel = true;
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn((frame: number) => {
      if (rejectCancel) {
        rejectCancel = false;
        throw new Error(`cancel ${frame} rejected`);
      }
    });
    const onFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const clock = createClock({ durationMs: null, onFrame });
    clock.play();

    expect(() => clock.dispose()).toThrow('cancel 1 rejected');
    clock.play();
    clock.seek(100);
    expect(() => clock.dispose()).not.toThrow();

    expect(clock.running).toBe(false);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(cancelFrame).toHaveBeenNthCalledWith(1, 1);
    expect(cancelFrame).toHaveBeenNthCalledWith(2, 1);
    expect(onFrame).not.toHaveBeenCalled();
  });
});
