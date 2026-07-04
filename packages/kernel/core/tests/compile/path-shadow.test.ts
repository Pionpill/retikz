import { describe, expect, it } from 'vitest';

import type { PathPrim, ScenePrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { PathSchema } from '../../src/schemas';
import { SHADOW_PRESETS } from '../../src/schemas';
import { arrowMarks } from '../helpers/arrow-marks';
import { flattenPrims } from '../helpers/flatten';

const silent = { onWarn: () => {} };

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = flattenPrims(prims).find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

const move = (to: [number, number]): unknown => ({ type: 'step', kind: 'move', to });
const line = (to: [number, number]): unknown => ({ type: 'step', kind: 'line', to });

const compilePath = (extra: Record<string, unknown>): ReturnType<typeof compileToScene> =>
  compileToScene(scene([{ type: 'path', children: [move([0, 0]), line([10, 0])], ...extra } as never]), silent);

const bottomOf = (layout: { y: number; height: number }): number => layout.y + layout.height;

// ════════════════ Happy ════════════════

describe('[path-shadow] Happy', () => {
  it('path-shadow：Path + shadow 对象 → 主 PathPrim 带 resolved shadow', () => {
    const prim = findPathPrim(
      compilePath({ stroke: 'steelblue', shadow: { offsetX: 1, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.4)' } })
        .primitives,
    );
    expect(prim.shadow).toEqual({ offsetX: 1, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.4)' });
  });

  it('path-shadow-preset：shadow="md" → PathPrim 带 SHADOW_PRESETS.md', () => {
    const prim = findPathPrim(compilePath({ stroke: 'steelblue', shadow: 'md' }).primitives);
    expect(prim.shadow).toEqual(SHADOW_PRESETS.md);
  });

  it('path-shadow-defaults：仅 offsetX/Y → blur/color 取默认 rgba(0,0,0,0.5)', () => {
    const prim = findPathPrim(compilePath({ shadow: { offsetX: 2, offsetY: 2 } }).primitives);
    expect(prim.shadow).toMatchObject({ offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.5)' });
  });
});

// ════════════════ 边界 ════════════════

describe('[path-shadow] 边界', () => {
  it('shadow-omitted-noop：不设 → PathPrim 无 shadow', () => {
    expect(findPathPrim(compilePath({}).primitives).shadow).toBeUndefined();
  });

  it('blur-zero-hard：blur=0 → 硬边', () => {
    const prim = findPathPrim(compilePath({ shadow: { offsetX: 1, offsetY: 1, blur: 0 } }).primitives);
    expect(prim.shadow!.blur).toBe(0);
  });

  it('preset-string-equals-preset-object：shadow="md" ≡ {preset:"md"}', () => {
    const a = findPathPrim(compilePath({ shadow: 'md' }).primitives);
    const b = findPathPrim(compilePath({ shadow: { preset: 'md' } }).primitives);
    expect(a.shadow).toEqual(b.shadow);
  });

  it('override-priority：{preset:"sm", offsetY:99} → offsetY=99、其余取 sm', () => {
    const prim = findPathPrim(compilePath({ shadow: { preset: 'sm', offsetY: 99 } }).primitives);
    expect(prim.shadow).toEqual({
      offsetX: SHADOW_PRESETS.sm!.offsetX,
      offsetY: 99,
      blur: SHADOW_PRESETS.sm!.blur,
      color: SHADOW_PRESETS.sm!.color,
    });
  });

  it('preset-none-noop：shadow="none" → PathPrim 无 shadow', () => {
    expect(findPathPrim(compilePath({ shadow: 'none' }).primitives).shadow).toBeUndefined();
  });
});

// ════════════════ 错误路径（schema 拒，PASS now） ════════════════

describe('[path-shadow] 错误路径（schema 拒）', () => {
  const path = (shadow: unknown): unknown => ({
    type: 'path',
    children: [move([0, 0]), line([10, 0])],
    shadow,
  });

  it('reject-nonfinite-offset：offsetX=Inf → 拒', () => {
    expect(PathSchema.safeParse(path({ offsetX: Infinity, offsetY: 1 })).success).toBe(false);
  });

  it('reject-bad-opacity：opacity>1 → 拒', () => {
    expect(PathSchema.safeParse(path({ offsetX: 1, offsetY: 1, opacity: 2 })).success).toBe(false);
  });

  it('reject-unknown-preset：shadow="huge" → 拒', () => {
    expect(PathSchema.safeParse(path('huge')).success).toBe(false);
  });

  it('reject-object-without-preset-or-offsets：{color:"red"} → refine 拒', () => {
    expect(PathSchema.safeParse(path({ color: 'red' })).success).toBe(false);
  });
});

// ════════════════ 交互 ════════════════

describe('[path-shadow] 交互', () => {
  // 注：仅断言 arrow spec 对象本身不冗余携带 shadow 字段（效果挂在 PathPrim 上）。渲染时端点箭头随主路径
  // 一起被 shadow / blend 牵连（SVG 元素级 filter / Canvas 同一绘制过程），属正确跨端语义，见 render 层测试。
  it('path-arrow-spec-no-shadow-field：带 arrow 的 path + shadow → endpoint arrow spec 不冗余带 shadow 字段', () => {
    const prim = findPathPrim(compilePath({ stroke: 'steelblue', marks: arrowMarks('->'), shadow: 'md' }).primitives);
    expect(prim.shadow).toEqual(SHADOW_PRESETS.md);
    expect(prim.arrowEnd).toBeDefined();
    expect((prim.arrowEnd as unknown as { shadow?: unknown }).shadow).toBeUndefined();
  });

  it('shadow-with-opacity：shadow + path opacity 共存，互不吞没', () => {
    const prim = findPathPrim(compilePath({ opacity: 0.6, shadow: 'md' }).primitives);
    expect(prim.opacity).toBe(0.6);
    expect(prim.shadow).toEqual(SHADOW_PRESETS.md);
  });

  it('shadow-expands-auto-layout：无显式 viewBox 时，Path shadow 外溢纳入 Scene.layout', () => {
    const plain = compilePath({});
    const shadowed = compilePath({ shadow: { offsetX: 0, offsetY: 20, blur: 10 } });
    expect(bottomOf(shadowed.layout)).toBeGreaterThan(bottomOf(plain.layout) + 25);
  });
});

// ════════════════ round-trip ════════════════

describe('[path-shadow] round-trip', () => {
  it('含 shadow（对象）的 IRPath JSON 往返 parse 深等', () => {
    const path = {
      type: 'path',
      children: [move([0, 0]), line([10, 0])],
      shadow: { offsetX: 1, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.4)' },
    };
    const parsed = PathSchema.parse(path);
    const round = PathSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.shadow).toEqual(parsed.shadow);
  });
});
