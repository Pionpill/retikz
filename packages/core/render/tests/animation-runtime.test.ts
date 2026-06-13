import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GroupPrim, IRAnimationTrack, RectPrim, Scene, ScenePrimitive } from '@retikz/core';
import {
  createClock,
  prefersReducedMotion,
  sceneAnimationDurationMs,
  sceneHasAnimations,
  sceneHasAutoplayTrigger,
} from '../src/animation/runtime';

/**
 * animation/runtime 纯逻辑锁定测试：scene 动画存在性 / 自动播放判定 / 总时长聚合（递归 group + 根镜头），
 * prefers-reduced-motion 读取与缺失降级，createClock 在无 requestAnimationFrame（SSR）下的同步定格行为。
 * 不触真 rAF / IntersectionObserver；只钉可纯函数化的部分。
 */

const layout = { x: 0, y: 0, width: 100, height: 100 };
const scene = (primitives: Array<ScenePrimitive>, animations?: Array<IRAnimationTrack>): Scene => ({
  primitives,
  layout,
  ...(animations ? { animations } : {}),
});
const rect = (extra: Partial<RectPrim> = {}): RectPrim => ({ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#f00', ...extra });
const group = (children: Array<ScenePrimitive>, extra: Partial<GroupPrim> = {}): GroupPrim => ({ type: 'group', children, ...extra });
const track = (extra: Partial<IRAnimationTrack> = {}): IRAnimationTrack => ({
  property: 'opacity',
  keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }],
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
    expect(sceneAnimationDurationMs(scene([rect({ animations: [track({ duration: 200, delay: 100, iterations: 3 })] })]))).toBe(700);
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
