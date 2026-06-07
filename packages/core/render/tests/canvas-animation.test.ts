import { describe, expect, it, vi } from 'vitest';
import type { IRAnimationTrack, PathPrim, RectPrim, Scene, ScenePrimitive } from '@retikz/core';
import { drawScene } from '../src/canvas';
import type { AnimationPropertyDefinition } from '../src/animation/registry';

/**
 * ADR-03 Canvas 动画播放：drawScene({time}) 逐帧应用 opacity/transform/pathDraw/自定义；无 time = 现状；
 *   自定义未注册 / pathDraw 无描边 warn；camera viewBox 叠 ctx 变换。
 */
type Call = { name: string; args: Array<unknown> };
type SpyCtx = CanvasRenderingContext2D & { calls: Array<Call> };
const createCtx = (): SpyCtx => {
  const calls: Array<Call> = [];
  const rec = (name: string) => (...args: Array<unknown>) => { calls.push({ name, args }); };
  const ctx = {
    calls,
    globalAlpha: 1, lineWidth: 1, lineDashOffset: 0,
    fillStyle: '#000', strokeStyle: '#000',
    font: '', textAlign: 'left', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter',
  } as unknown as SpyCtx;
  for (const m of ['save', 'restore', 'beginPath', 'rect', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath', 'arc', 'ellipse', 'fill', 'stroke', 'setLineDash', 'translate', 'scale', 'rotate', 'fillText', 'clip']) {
    (ctx as unknown as Record<string, unknown>)[m] = rec(m);
  }
  return ctx;
};
const layout = { x: 0, y: 0, width: 100, height: 100 };
const scene = (primitives: Array<ScenePrimitive>, animations?: Array<IRAnimationTrack>): Scene => ({ primitives, layout, ...(animations ? { animations } : {}) });
const rect = (extra: Partial<RectPrim> = {}): RectPrim => ({ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#f00', ...extra });
const argsOf = (ctx: SpyCtx, name: string): Array<Array<unknown>> => ctx.calls.filter(c => c.name === name).map(c => c.args);

describe('Happy：drawScene({time}) 应用通道', () => {
  it('translateX track 在中点 → ctx.translate(50, 0)', () => {
    const t: IRAnimationTrack = { property: 'translateX', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 100 }], duration: 400 };
    const ctx = createCtx();
    drawScene(ctx, scene([rect({ animations: [t] })]), { time: 200 });
    expect(argsOf(ctx, 'translate')).toContainEqual([50, 0]);
  });

  it('scaleY + origin south 在中点 → 绕支点 ctx.scale(1, 0.5)', () => {
    const t: IRAnimationTrack = { property: 'scaleY', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400, origin: 'south' };
    const ctx = createCtx();
    drawScene(ctx, scene([rect({ animations: [t] })]), { time: 200 });
    expect(argsOf(ctx, 'scale')).toContainEqual([1, 0.5]);
    expect(argsOf(ctx, 'translate')).toContainEqual([5, 10]); // rect 10×10 south 支点
  });

  it('pathDraw（有描边）→ setLineDash([len]) + lineDashOffset 设置', () => {
    const path: PathPrim = { type: 'path', commands: [{ kind: 'move', to: [0, 0] }, { kind: 'line', to: [10, 0] }], stroke: '#000' };
    const draw: IRAnimationTrack = { property: 'pathDraw', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400 };
    const ctx = createCtx();
    drawScene(ctx, scene([{ ...path, animations: [draw] }]), { time: 200 });
    const dash = argsOf(ctx, 'setLineDash').find(a => Array.isArray(a[0]) && (a[0] as Array<number>).length === 1);
    expect(dash).toBeDefined();
    expect((dash![0] as Array<number>)[0]).toBeCloseTo(10); // 线长 10
    expect(ctx.lineDashOffset).toBeCloseTo(5); // len*(1-0.5)
  });

  it('自定义 property → 注册 def 的 applyCanvas 被调', () => {
    const apply = vi.fn();
    const def: AnimationPropertyDefinition = { interpolate: (a, b, t) => (a as number) + ((b as number) - (a as number)) * t, applyCanvas: apply };
    const blur: IRAnimationTrack = { property: 'blur', keyframes: [{ at: 0, value: 4 }, { at: 1, value: 0 }], duration: 400 };
    drawScene(createCtx(), scene([rect({ animations: [blur] })]), { time: 200, animationProperties: { blur: def } });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][2]).toBeCloseTo(2); // 中点值
  });
});

describe('边界', () => {
  it('无 time → 不应用动画（无 translate 调用，与现状一致）', () => {
    const t: IRAnimationTrack = { property: 'translateX', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 100 }], duration: 400 };
    const ctx = createCtx();
    drawScene(ctx, scene([rect({ animations: [t] })]));
    expect(argsOf(ctx, 'translate')).toHaveLength(0);
  });

  it('fill forwards：time 超时长 → 停末帧（scale 1）', () => {
    const t: IRAnimationTrack = { property: 'scaleX', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400 };
    const ctx = createCtx();
    drawScene(ctx, scene([rect({ animations: [t] })]), { time: 9999 });
    expect(argsOf(ctx, 'scale')).toContainEqual([1, 1]);
  });
});

describe('降级', () => {
  it('未注册自定义 property → warn + skip', () => {
    const warn = vi.fn();
    const blur: IRAnimationTrack = { property: 'blur', keyframes: [{ at: 0, value: 4 }, { at: 1, value: 0 }], duration: 400 };
    drawScene(createCtx(), scene([rect({ animations: [blur] })]), { time: 200, warnUnsupported: warn });
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ feature: 'animation' }));
  });

  it('pathDraw 挂无描边元素 → warn + skip', () => {
    const warn = vi.fn();
    const draw: IRAnimationTrack = { property: 'pathDraw', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400 };
    drawScene(createCtx(), scene([rect({ animations: [draw] })]), { time: 200, warnUnsupported: warn });
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ feature: 'animation' }));
  });
});

describe('交互', () => {
  it('camera viewBox → 绘制前叠 ctx.translate + scale', () => {
    const camera: IRAnimationTrack = { property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 100, 100] }, { at: 1, value: [25, 25, 50, 50] }], duration: 400 };
    const ctx = createCtx();
    // t=400 末帧取景 [25,25,50,50] → sx=sy=2，translate(-50,-50)
    drawScene(ctx, scene([rect()], [camera]), { time: 400 });
    expect(argsOf(ctx, 'scale')).toContainEqual([2, 2]);
    expect(argsOf(ctx, 'translate')).toContainEqual([-50, -50]);
  });
});
