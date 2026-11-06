import { describe, expect, it } from 'vitest';

import type { CompiledBoundaryGeometry } from '../../../../core/src';
import type { PositionEvaluateContext } from '../../../../core/src/compile';
import { projectLayoutWithTransform } from '../../../../core/src/compile/boundary';
import type { CompiledNodeLayout } from '../../../../core/src/compile/node';
import { referencePositionOf, createPositionEvaluateContext } from '../../../../core/src/compile/reference';
import { lowerScopeTransforms } from '../../../../core/src/compile/scope/placement/transform';
import { composeScopeTransform } from '../../../../core/src/compile/shared';
import type { Transform } from '../../../../core/src/contract';
import { BUILTIN_SHAPES } from '../../../../core/src/providers/shape/shape';
import type { IRTransform } from '../../../../core/src/schemas';
import { NamespaceStack } from '../../../src/compile/runtime';

/** 把 id → 中心 entries 灌进新建的 namespaceStack，便于 lower 单测验证 referent lookup */
const makeStack = (entries: Array<[string, [number, number]]>): NamespaceStack => {
  const stack = new NamespaceStack();

  for (const [index, [id, [x, y]]] of entries.entries()) {
    const layout: CompiledBoundaryGeometry & Pick<CompiledNodeLayout, 'geometry'> = {
      shape: { name: 'rectangle', definition: BUILTIN_SHAPES.get('rectangle')!, params: {} },
      geometry: {
        rect: { x, y, width: 0, height: 0, rotate: 0 },
        contentCenter: [x, y],
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        contentSize: { width: 0, height: 0 },
      },
      boundary: {
        name: BUILTIN_SHAPES.get('rectangle')!.name,
        definition: BUILTIN_SHAPES.get('rectangle')!,
        params: {},
        isShape: true,
      },
    };
    stack.register(id, { geometry: layout, irPath: ['children', index, 'id'] });
  }

  return stack;
};

const layoutForProjection = (): CompiledBoundaryGeometry & Pick<CompiledNodeLayout, 'geometry'> => ({
  shape: { name: 'rectangle', definition: BUILTIN_SHAPES.get('rectangle')!, params: {} },
  geometry: {
    rect: { x: 10, y: 20, width: 30, height: 40, rotate: 0 },
    contentCenter: [10, 20],
    margin: { top: 2, right: 2, bottom: 2, left: 2 },
    contentSize: { width: 30, height: 40 },
  },
  boundary: {
    name: BUILTIN_SHAPES.get('rectangle')!.name,
    definition: BUILTIN_SHAPES.get('rectangle')!,
    params: {},
    isShape: true,
  },
});

type LowerOptions = Omit<Parameters<typeof lowerScopeTransforms>[1], 'positionContext'> &
  Readonly<{
    nodeDistance?: number;
    scopeChain?: ReadonlyArray<Transform>;
    resolveBetweenGlobal?: PositionEvaluateContext['evaluateBetweenWorld'];
  }>;

const lower = (
  transforms: ReadonlyArray<IRTransform>,
  namespaceStack: NamespaceStack = new NamespaceStack(),
  options: LowerOptions = {},
) => {
  const { nodeDistance = 24, scopeChain, resolveBetweenGlobal, ...rest } = options;
  const base = createPositionEvaluateContext({
    lookupReference: id => namespaceStack.lookupReference(id),
    nodeDistance,
    transformChain: scopeChain,
  });
  const positionContext = { ...base, evaluateBetweenWorld: resolveBetweenGlobal };

  return lowerScopeTransforms(transforms, { positionContext, ...rest });
};

describe('lowerScopeTransforms 5 translate 变体', () => {
  it('translate 直接透传', () => {
    const out = lower([{ kind: 'translate', x: 5, y: 3 }]);

    expect(out).toEqual([{ kind: 'translate', x: 5, y: 3 }]);
  });

  it('polar-translate 不带 origin lower 成笛卡尔', () => {
    const out = lower([{ kind: 'polar-translate', angle: 0, radius: 50 }]);

    expect(out).not.toBeNull();
    expect(out![0]).toMatchObject({ kind: 'translate' });

    const t = out![0] as { x: number; y: number };

    expect(t.x).toBeCloseTo(50, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate 带 origin=string id', () => {
    const idx = makeStack([['A', [10, 0]]]);
    const out = lower([{ kind: 'polar-translate', origin: 'A', angle: 0, radius: 30 }], idx);

    expect(out).not.toBeNull();

    const t = out![0] as { x: number; y: number };

    expect(t.x).toBeCloseTo(40, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate 带 origin=笛卡尔', () => {
    const out = lower([{ kind: 'polar-translate', origin: [10, 5], angle: 90, radius: 20 }]);

    expect(out).not.toBeNull();

    const t = out![0] as { x: number; y: number };

    expect(t.x).toBeCloseTo(10, 6);
    expect(t.y).toBeCloseTo(25, 6);
  });

  it('polar-translate radius=0 等价 translate(0, 0)', () => {
    const out = lower([{ kind: 'polar-translate', angle: 45, radius: 0 }]);
    const t = out![0] as { x: number; y: number };

    expect(t.x).toBeCloseTo(0, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate angle=360 与 angle=0 数值结果一致', () => {
    const a = lower([{ kind: 'polar-translate', angle: 360, radius: 50 }]);
    const b = lower([{ kind: 'polar-translate', angle: 0, radius: 50 }]);

    expect((a![0] as { x: number; y: number }).x).toBeCloseTo((b![0] as { x: number; y: number }).x, 6);
    expect((a![0] as { x: number; y: number }).y).toBeCloseTo((b![0] as { x: number; y: number }).y, 6);
  });

  it('at-translate 含 distance lower 成笛卡尔', () => {
    const idx = makeStack([['A', [0, 0]]]);
    const out = lower([{ kind: 'at-translate', direction: 'right', of: 'A', distance: 20 }], idx);

    expect(out![0]).toEqual({ kind: 'translate', x: 20, y: 0 });
  });

  it('at-translate 缺 distance 走 nodeDistance', () => {
    const idx = makeStack([['A', [0, 0]]]);
    const out = lower([{ kind: 'at-translate', direction: 'top', of: 'A' }], idx, { nodeDistance: 15 });

    expect(out![0]).toEqual({ kind: 'translate', x: 0, y: -15 });
  });

  it('偏移翻译=字符串+偏移', () => {
    const idx = makeStack([['A', [0, 0]]]);
    const out = lower([{ kind: 'offset-translate', of: 'A', offset: [10, 5] }], idx);

    expect(out![0]).toEqual({ kind: 'translate', x: 10, y: 5 });
  });

  it('offset-translate of=string 缺 offset', () => {
    const idx = makeStack([['A', [100, 100]]]);
    const out = lower([{ kind: 'offset-translate', of: 'A' }], idx);

    expect(out![0]).toEqual({ kind: 'translate', x: 100, y: 100 });
  });

  it('between-translate 解析两端点比例点', () => {
    const idx = makeStack([
      ['A', [0, 0]],
      ['B', [100, 40]],
    ]);
    const out = lower([{ kind: 'between-translate', between: [{ id: 'A' }, { id: 'B' }], fraction: 0.25 }], idx, {
      resolveBetweenGlobal: between => {
        const [a, b] = between.between;
        const aLayout = 'id' in a ? idx.lookupReference(a.id)?.geometry : null;
        const bLayout = 'id' in b ? idx.lookupReference(b.id)?.geometry : null;
        if (!aLayout || !bLayout) return null;
        const aPoint = referencePositionOf(aLayout);
        const bPoint = referencePositionOf(bLayout);

        return [
          aPoint[0] + (bPoint[0] - aPoint[0]) * between.fraction,
          aPoint[1] + (bPoint[1] - aPoint[1]) * between.fraction,
        ];
      },
    });

    expect(out![0]).toEqual({ kind: 'translate', x: 25, y: 10 });
  });
});

describe('lowerScopeTransforms 失败情形', () => {
  it('at-translate of 未解析返回 null', () => {
    const out = lower([{ kind: 'at-translate', direction: 'right', of: 'B' }], undefined, { nodeDistance: 10 });

    expect(out).toBeNull();
  });

  it('offset-translate of=string 未解析返回 null', () => {
    const out = lower([{ kind: 'offset-translate', of: 'B', offset: [5, 0] }]);

    expect(out).toBeNull();
  });

  it('polar-translate origin=string 未解析返回 null', () => {
    const out = lower([{ kind: 'polar-translate', origin: 'B', angle: 0, radius: 10 }]);

    expect(out).toBeNull();
  });

  it('between-translate 未提供解析器返回 null', () => {
    const idx = makeStack([
      ['A', [0, 0]],
      ['B', [100, 40]],
    ]);
    const out = lower([{ kind: 'between-translate', between: [{ id: 'A' }, { id: 'B' }], fraction: 0.5 }], idx);

    expect(out).toBeNull();
  });

  it('链中混合：合法 translate + 失败 at-translate → 整体 null', () => {
    const out = lower(
      [
        { kind: 'translate', x: 5, y: 0 },
        { kind: 'at-translate', direction: 'right', of: 'missing' },
      ],
      undefined,
      { nodeDistance: 10 },
    );

    expect(out).toBeNull();
  });
});

describe('lowerScopeTransforms rotate / scale 透传', () => {
  it('rotate pivot=center 解析 intrinsic envelope 中心并 lower 为 Scene cx/cy', () => {
    const out = lower([{ kind: 'rotate', degrees: 45, pivot: 'center' }], undefined, {
      intrinsicContext: layoutForProjection(),
    });

    expect(out![0]).toEqual({ kind: 'rotate', degrees: 45, cx: 10, cy: 20 });
  });

  it('rotate 缺省 pivot=origin，不生成 cx/cy', () => {
    const out = lower([{ kind: 'rotate', degrees: 30 }]);

    expect(out![0]).toEqual({ kind: 'rotate', degrees: 30 });
  });

  it('scale 含 y', () => {
    const out = lower([{ kind: 'scale', x: 2, y: 3 }]);

    expect(out![0]).toEqual({ kind: 'scale', x: 2, y: 3 });
  });

  it('scale 缺 y 不带它', () => {
    const out = lower([{ kind: 'scale', x: 2 }]);

    expect(out![0]).toEqual({ kind: 'scale', x: 2 });
  });

  it('scale pivot 显式坐标展开为 translate(p) → scale → translate(-p)', () => {
    const out = lower([{ kind: 'scale', x: 2, y: 3, pivot: [4, 5] }], undefined, {
      intrinsicContext: layoutForProjection(),
    });

    expect(out).toEqual([
      { kind: 'translate', x: 4, y: 5 },
      { kind: 'scale', x: 2, y: 3 },
      { kind: 'translate', x: -4, y: -5 },
    ]);
  });

  it('rectangle self point 包含 margin，top-left 解析为 outerRect 左上角', () => {
    const out = lower([{ kind: 'rotate', degrees: 15, pivot: 'top-left' }], undefined, {
      intrinsicContext: layoutForProjection(),
    });

    expect(out).toEqual([{ kind: 'rotate', degrees: 15, cx: -7, cy: -2 }]);
  });

  it('projectLayoutWithTransform 在负 scale 下保持 rect 尺寸为正数', () => {
    const layout = projectLayoutWithTransform(
      layoutForProjection(),
      composeScopeTransform([{ kind: 'scale', x: -2, y: 3 }]),
    );

    expect(layout.geometry.rect.x).toBeCloseTo(-20, 6);
    expect(layout.geometry.rect.y).toBeCloseTo(60, 6);
    expect(layout.geometry.rect.width).toBe(60);
    expect(layout.geometry.rect.height).toBe(120);
    expect(layout.geometry.margin).toEqual({ top: 6, right: 4, bottom: 6, left: 4 });
  });

  it('projectLayoutWithTransform 应同步 rect.rotate 与 rotateDeg', () => {
    const layout = projectLayoutWithTransform(
      layoutForProjection(),
      composeScopeTransform([{ kind: 'rotate', degrees: 45 }]),
    );

    expect(layout.geometry.rect.rotate).toBeCloseTo(Math.PI / 4, 6);
    expect(((layout.geometry.rect.rotate ?? 0) * 180) / Math.PI).toBeCloseTo(45, 6);
  });
});

describe('lowerScopeTransforms 链复合', () => {
  it('混合 5 种 translate 变体 + rotate + scale 全部成功 lower', () => {
    const idx = makeStack([
      ['A', [10, 0]],
      ['B', [0, 0]],
    ]);
    const transforms: Array<IRTransform> = [
      { kind: 'translate', x: 5, y: 5 },
      { kind: 'polar-translate', angle: 0, radius: 10 },
      { kind: 'at-translate', direction: 'right', of: 'A', distance: 4 },
      { kind: 'offset-translate', of: 'B', offset: [1, 2] },
      { kind: 'between-translate', between: [{ id: 'A' }, { id: 'B' }], fraction: 0.5 },
      { kind: 'rotate', degrees: 30 },
      { kind: 'scale', x: 2 },
    ];
    const out = lower(transforms, idx, {
      resolveBetweenGlobal: between => {
        const [a, b] = between.between;
        const aLayout = 'id' in a ? idx.lookupReference(a.id)?.geometry : null;
        const bLayout = 'id' in b ? idx.lookupReference(b.id)?.geometry : null;
        if (!aLayout || !bLayout) return null;
        const aPoint = referencePositionOf(aLayout);
        const bPoint = referencePositionOf(bLayout);

        return [
          aPoint[0] + (bPoint[0] - aPoint[0]) * between.fraction,
          aPoint[1] + (bPoint[1] - aPoint[1]) * between.fraction,
        ];
      },
    });

    expect(out).not.toBeNull();
    expect(out!).toHaveLength(7);
    expect(out![0]).toEqual({ kind: 'translate', x: 5, y: 5 });
    expect((out![1] as { x: number; y: number }).x).toBeCloseTo(10, 6);
    expect(out![2]).toEqual({ kind: 'translate', x: 14, y: 0 });
    expect(out![3]).toEqual({ kind: 'translate', x: 1, y: 2 });
    expect(out![4]).toEqual({ kind: 'translate', x: 5, y: 0 });
    expect(out![5]).toEqual({ kind: 'rotate', degrees: 30 });
    expect(out![6]).toEqual({ kind: 'scale', x: 2 });
  });
});
