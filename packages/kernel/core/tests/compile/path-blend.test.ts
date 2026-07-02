/**
 * Path blend mode 编译测试：blendMode 解析后落到主 PathPrim 上。
 * 跨端像素 parity 留 render 测试。
 */
import { describe, expect, it } from 'vitest';

import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import type { IR } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { PathSchema } from '../../src/schemas';
import { BlendMode } from '../../src/schemas';
import { arrowMarks } from '../helpers/arrow-marks';
import { flattenPrims } from '../helpers/flatten';

const silent = { onWarn: () => {} };

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = flattenPrims(prims).find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

const move = (to: [number, number]): unknown => ({ type: 'step', kind: 'move', to });
const line = (to: [number, number]): unknown => ({ type: 'step', kind: 'line', to });

const compilePath = (extra: Record<string, unknown>): ReturnType<typeof compileToScene> =>
  compileToScene(scene([{ type: 'path', children: [move([0, 0]), line([10, 0])], ...extra } as never]), silent);

// ════════════════ Happy ════════════════

describe('[path-blend] Happy', () => {
  it('path-blend：Path + blendMode="screen" → 主 PathPrim 带 blendMode', () => {
    const prim = findPathPrim(compilePath({ stroke: 'cyan', blendMode: 'screen' }).primitives);
    expect(prim.blendMode).toBe('screen');
  });

  it('all-16-modes-accepted：16 个值 schema 全过', () => {
    for (const mode of Object.values(BlendMode)) {
      const parsed = PathSchema.safeParse({ type: 'path', children: [move([0, 0]), line([10, 0])], blendMode: mode });
      expect(parsed.success, mode).toBe(true);
    }
  });
});

// ════════════════ 边界 ════════════════

describe('[path-blend] 边界', () => {
  it('blend-omitted-noop：不设 → PathPrim 无 blendMode', () => {
    expect(findPathPrim(compilePath({}).primitives).blendMode).toBeUndefined();
  });

  it('blend-normal-equals-omitted：blendMode="normal" 与省略编译等价', () => {
    const withNormal = findPathPrim(compilePath({ blendMode: 'normal' }).primitives);
    const omitted = findPathPrim(compilePath({}).primitives);
    expect(withNormal.blendMode ?? 'normal').toBe(omitted.blendMode ?? 'normal');
  });
});

// ════════════════ 错误路径（schema 拒，PASS now） ════════════════

describe('[path-blend] 错误路径（schema 拒）', () => {
  const path = (blendMode: unknown): unknown => ({
    type: 'path',
    children: [move([0, 0]), line([10, 0])],
    blendMode,
  });

  it('reject-unknown-mode：blendMode="glow" → 拒', () => {
    expect(PathSchema.safeParse(path('glow')).success).toBe(false);
  });

  it('reject-non-string：数字 / null → 拒', () => {
    expect(PathSchema.safeParse(path(3)).success).toBe(false);
    expect(PathSchema.safeParse(path(null)).success).toBe(false);
  });
});

// ════════════════ 交互 ════════════════

describe('[path-blend] 交互', () => {
  it('blend-text-not-inherited（path 类比）：带 arrow 的 path + blendMode → arrow spec 不带 blendMode', () => {
    const prim = findPathPrim(compilePath({ stroke: 'cyan', marks: arrowMarks('->'), blendMode: 'multiply' }).primitives);
    expect(prim.blendMode).toBe('multiply');
    expect(prim.arrowEnd).toBeDefined();
    expect((prim.arrowEnd as unknown as { blendMode?: unknown }).blendMode).toBeUndefined();
  });

  it('blend-with-opacity-shadow：blendMode + opacity + shadow 三者共存正确', () => {
    const prim = findPathPrim(compilePath({ opacity: 0.7, shadow: 'md', blendMode: 'multiply' }).primitives);
    expect(prim.opacity).toBe(0.7);
    expect(prim.blendMode).toBe('multiply');
    expect(prim.shadow).toBeDefined();
  });
});

// ════════════════ round-trip ════════════════

describe('[path-blend] round-trip', () => {
  it('含 blendMode 的 IRPath JSON 往返 parse 深等', () => {
    const path = { type: 'path', children: [move([0, 0]), line([10, 0])], blendMode: 'screen' };
    const parsed = PathSchema.parse(path);
    const round = PathSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.blendMode).toBe(parsed.blendMode);
  });
});
