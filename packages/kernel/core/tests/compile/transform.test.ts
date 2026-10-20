import { describe, expect, it } from 'vitest';

import { createPositionResolveContext } from '../../src/compile/orchestration/position-context';
import { applyTransformChain, inverseTransformChain, createScopeTransformContext } from '../../src/compile/transform';
import type { Transform } from '../../src/contract';

describe('坐标变换的数值与可逆边界', () => {
  it('补入父级变换后更新坐标且不污染原链与兄弟 Scope', () => {
    const transforms = createScopeTransformContext();
    const parent = [{ kind: 'translate', x: 10, y: 20 }] as const;
    const child = transforms.append(parent, [{ kind: 'scale', x: 2, y: 3 }]);
    expect(transforms.apply([4, 5], child)).toEqual([18, 35]);
    const settled = transforms.insert(child, parent.length, [{ kind: 'rotate', degrees: 90 }]);
    const world = transforms.apply([4, 5], settled);
    expect(world[0]).toBeCloseTo(-5, 12);
    expect(world[1]).toBeCloseTo(28, 12);
    expect(transforms.apply([4, 5], child)).toEqual([18, 35]);
    expect(transforms.apply([4, 5], parent)).toEqual([14, 25]);
    const local = transforms.inverse(world, settled);
    expect(local[0]).toBeCloseTo(4, 12);
    expect(local[1]).toBeCloseTo(5, 12);
  });

  it('多层旋转、非均匀负缩放与 pivot 保持逐项变换的几何结果', () => {
    const transforms = createScopeTransformContext();
    let chain: ReadonlyArray<Transform> = [];
    for (let level = 0; level < 32; level++) {
      chain = transforms.append(chain, [
        { kind: 'translate', x: level / 3, y: -level / 7 },
        { kind: 'rotate', degrees: 13.7, cx: 2, cy: -5 },
        { kind: 'scale', x: -1.01, y: 0.99 },
      ]);
    }
    for (const point of [
      [0, 0],
      [12.3, -47.1],
      [-33, 22],
    ] as const) {
      const expected = applyTransformChain([point[0], point[1]], chain);
      const actual = transforms.apply([point[0], point[1]], chain);
      expect(actual[0]).toBeCloseTo(expected[0], 9);
      expect(actual[1]).toBeCloseTo(expected[1], 9);
      const local = transforms.inverse(actual, chain);
      expect(local[0]).toBeCloseTo(point[0], 9);
      expect(local[1]).toBeCloseTo(point[1], 9);
    }
  });
  it('非交换变换按内层到外层投影，反投影恢复局部点', () => {
    const chain: Array<Transform> = [
      { kind: 'translate', x: 11, y: -7 },
      { kind: 'rotate', degrees: 90, cx: 2, cy: 3 },
      { kind: 'scale', x: -2, y: 3 },
    ];
    const context = createPositionResolveContext({
      lookupReference: () => undefined,
      nodeDistance: 24,
      scopeChain: chain,
    });
    const world = context.toWorld([4, 5]);
    expect(world[0]).toBeCloseTo(1, 12);
    expect(world[1]).toBeCloseTo(-14, 12);
    const local = context.toLocal(world);
    expect(local[0]).toBeCloseTo(4, 12);
    expect(local[1]).toBeCloseTo(5, 12);
  });

  it('零缩放允许正向投影，仅反投影报错', () => {
    const context = createPositionResolveContext({
      lookupReference: () => undefined,
      nodeDistance: 24,
      scopeChain: [{ kind: 'scale', x: 0, y: 2 }],
    });
    expect(context.toWorld([5, 7])).toEqual([0, 14]);
    expect(() => context.toLocal([0, 14])).toThrow('non-invertible scope transform');
  });

  it.each([1e-14, 1e-200, 1e-320])('非零缩放 %s 不被行列式阈值拒绝', scale => {
    const context = createPositionResolveContext({
      lookupReference: () => undefined,
      nodeDistance: 24,
      scopeChain: [{ kind: 'scale', x: scale, y: scale }],
    });
    const local = context.toLocal([scale, scale]);
    expect(local).toEqual([1, 1]);
  });

  it('独立上下文和重复创建不会复用其他链的变换', () => {
    for (const x of [10, -30, 10]) {
      const context = createPositionResolveContext({
        lookupReference: () => undefined,
        nodeDistance: 24,
        scopeChain: [{ kind: 'translate', x, y: 4 }],
      });
      expect(context.toWorld([2, 3])).toEqual([x + 2, 7]);
    }
  });

  it('大幅缩放相互抵消时仍产生有限坐标', () => {
    const chain: Array<Transform> = [
      { kind: 'scale', x: 1e-200 },
      { kind: 'scale', x: 1e200 },
    ];
    expect(applyTransformChain([1, 2], chain)).toEqual([1, 2]);
    expect(inverseTransformChain([1, 2], chain)).toEqual([1, 2]);
  });

  it('累计尺度下溢时不把逐项运算的非有限结果隐藏为零', () => {
    const chain: Array<Transform> = [
      { kind: 'scale', x: 1e-200 },
      { kind: 'scale', x: 1e-200 },
      { kind: 'scale', x: 1e200 },
    ];
    const context = createPositionResolveContext({
      lookupReference: () => undefined,
      nodeDistance: 24,
      scopeChain: chain,
    });
    expect(context.toWorld([1e200, 1e200])).toEqual(applyTransformChain([1e200, 1e200], chain));
  });
});
