import type { IRPathBase, IRPathMark, ScenePrimitive } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { WeaveManager, readWeaveCurrent } from '../../src/weave';
import { compileTestResult } from '../helpers/compilation';

/** 从真实编译结果获取沿线标记的放置坐标 */
const markPosition = (path: IRPathBase): readonly [number, number] => {
  const scene = compileTestResult({ type: 'scene', version: 1, children: [path] }).scene;
  const findPlacement = (primitives: ReadonlyArray<ScenePrimitive>): readonly [number, number] | undefined => {
    for (const primitive of primitives) {
      if (primitive.type !== 'group') continue;
      const translation = primitive.transforms?.[0];
      if (translation?.kind === 'translate' && primitive.transforms?.some(transform => transform.kind === 'scale'))
        return [translation.x, translation.y];
      const nested = findPlacement(primitive.children);
      if (nested !== undefined) return nested;
    }
    return undefined;
  };
  const placement = findPlacement(scene.primitives);
  if (placement === undefined) throw new Error('Expected a placed mark');
  return placement;
};

/** 长度不同的相邻线段，用于区分参数份额与距离比例 */
const cornerPath = (mark: IRPathMark, radius = 10): IRPathBase => ({
  type: 'path',
  cornerRadius: radius,
  marks: [{ shape: 'star', ...mark }],
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [80, 0] },
    { type: 'step', kind: 'line', to: [80, 40] },
  ],
});

describe('路径比例与几何独立选择', () => {
  it('低输出精度不改变无圆角曲线的原始与圆角定位模型', () => {
    const children: IRPathBase['children'] = [
      { type: 'step', kind: 'move', to: [0.19, 0.27] },
      { type: 'step', kind: 'cubic', control1: [0.19, 0.27], control2: [0.19, 0.27], to: [100.81, 0.27] },
    ];
    const compile = (positionGeometry: 'original' | 'rounded') =>
      compileTestResult(
        {
          type: 'scene',
          version: 1,
          children: [
            { type: 'path', children, marks: [{ shape: 'star', pos: 0.5, positionMode: 'length', positionGeometry }] },
          ],
        },
        { precision: 0 },
      );
    expect(compile('rounded')).toEqual(compile('original'));
    const session = new WeaveManager(
      { type: 'scene', version: 1, children: [{ type: 'path', children, marks: [{ shape: 'star', pos: 0.5 }] }] },
      { precision: 0 },
    );
    const mounted = session.mount();
    const node = readWeaveCurrent(mounted.root).children[0];
    if (node.type !== 'path') throw new Error('Expected path');
    const layout = readWeaveCurrent(node).compiled?.stroke?.layout;
    expect(layout?.positions?.original.totalLength).toBeCloseTo(100.62, 6);
    expect(layout?.marks?.[0]?.placement?.point[0]).toBeCloseTo(50.5, 5);
  });
  it('有限线段累计长度溢出时报告几何错误', () => {
    expect(() =>
      markPosition({
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [1e308, 0] },
          { type: 'step', kind: 'line', to: [0, 0] },
        ],
        marks: [{ shape: 'star', pos: 0.5 }],
      }),
    ).toThrow('Path cumulative length is not finite');
  });
  it('短边两端圆角相接时参数定位仍连续并保留原份额', () => {
    const path: IRPathBase = {
      type: 'path',
      cornerRadius: 20,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
        { type: 'step', kind: 'line', to: [100, 10] },
        { type: 'step', kind: 'line', to: [200, 10] },
      ],
    };
    const sample = (pos: number) =>
      markPosition({ ...path, marks: [{ shape: 'star', pos, positionMode: 'step', positionGeometry: 'rounded' }] });
    expect(sample(0.5)).toEqual([100, 5]);
    for (const pos of [1 / 3, 0.5, 2 / 3]) {
      const before = sample(pos - 1e-6);
      const after = sample(pos + 1e-6);
      expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeLessThan(0.01);
    }
  });
  it.each([
    { position: 0.8, hasGap: true },
    { position: 0.9, hasGap: false },
  ])('原始标签 position=$position 仅在保留的几何上产生断口', ({ position, hasGap }) => {
    const session = new WeaveManager({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          cornerRadius: 20,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'line',
              to: [100, 0],
              label: { text: 'cut', position, side: 'center', interrupt: true },
            },
            { type: 'step', kind: 'line', to: [100, 100] },
          ],
        },
      ],
    });
    const mounted = session.mount();
    const path = readWeaveCurrent(mounted.root).children[0];
    if (path.type !== 'path') throw new Error('Expected path');
    const layout = readWeaveCurrent(path).compiled?.stroke?.layout;
    expect(layout?.labels?.steps?.[1]?.placement?.logicalSample !== undefined).toBe(hasGap);
    expect(layout?.body?.kind).toBe(hasGap ? 'interrupted' : 'continuous');
  });

  it.each([0, 0.000001, 1])('竖直非匀速曲线在 position=%s 保留真实切线', pos => {
    const session = new WeaveManager({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', control1: [0, 0], control2: [0, 0], to: [0, 100] },
          ],
          marks: [{ shape: 'star', pos, positionMode: 'step' }],
        },
      ],
    });
    const mounted = session.mount();
    const path = readWeaveCurrent(mounted.root).children[0];
    if (path.type !== 'path') throw new Error('Expected path');
    const rotation = readWeaveCurrent(path).compiled?.stroke?.layout?.marks?.[0]?.placement?.transforms[1];
    expect(rotation).toEqual({ kind: 'rotate', degrees: 90 });
  });
  it('闭合圆角的首步骤局部长度从起始圆角中点开始', () => {
    const session = new WeaveManager({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          cornerRadius: 20,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'line',
              to: [100, 0],
              label: { text: 'start', position: 0, positionMode: 'length', positionGeometry: 'rounded' },
            },
            { type: 'step', kind: 'line', to: [100, 100] },
            { type: 'step', kind: 'line', to: [0, 100] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    });
    const mounted = session.mount();
    const path = readWeaveCurrent(mounted.root).children[0];
    if (path.type !== 'path') throw new Error('Expected path');
    const point =
      readWeaveCurrent(path).compiled?.stroke?.layout?.labels?.steps?.[1]?.placement?.logicalSample?.sample.point;
    expect(point?.[0]).toBeCloseTo(20 - 20 * Math.SQRT1_2, 6);
    expect(point?.[1]).toBeCloseTo(20 - 20 * Math.SQRT1_2, 6);
  });

  it('零长段与 move 跳跃不占份额，非零闭合段参与定位', () => {
    const path: IRPathBase = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
        { type: 'step', kind: 'move', to: [1000, 0] },
        { type: 'step', kind: 'line', to: [1000, 50] },
        { type: 'step', kind: 'cycle' },
      ],
      marks: [{ shape: 'star', pos: 1 / 3, positionMode: 'step' }],
    };
    expect(markPosition(path)).toEqual([1000, 0]);
    expect(markPosition({ ...path, marks: [{ shape: 'star', pos: 1, positionMode: 'length' }] })).toEqual([1000, 0]);
  });
  it('默认步骤定位保留原拐点，显式圆角定位映射到圆弧中点', () => {
    expect(markPosition(cornerPath({ pos: 0.5, positionMode: 'step' }))).toEqual([80, 0]);
    const rounded = markPosition(cornerPath({ pos: 0.5, positionMode: 'step', positionGeometry: 'rounded' }));
    expect(rounded[0]).toBeCloseTo(70 + Math.SQRT1_2 * 10, 2);
    expect(rounded[1]).toBeCloseTo(10 - Math.SQRT1_2 * 10, 2);
  });

  it('长度定位分别使用原始与圆角后的累计长度', () => {
    expect(markPosition(cornerPath({ pos: 0.5, positionMode: 'length', positionGeometry: 'original' }))).toEqual([
      60, 0,
    ]);
    const rounded = markPosition(cornerPath({ pos: 0.5 }));
    expect(rounded[0]).toBeCloseTo((100 + Math.PI * 5) / 2, 2);
    expect(rounded[1]).toBe(0);
  });

  it('共线非匀速贝塞尔的长度反解不等同于参数插值', () => {
    const path: IRPathBase = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'cubic', control1: [0, 0], control2: [0, 0], to: [100, 0] },
      ],
      marks: [{ pos: 0.5, shape: 'star', positionMode: 'step' }],
    };
    expect(markPosition(path)).toEqual([12.5, 0]);
    expect(markPosition({ ...path, marks: [{ pos: 0.5, shape: 'star', positionMode: 'length' }] })).toEqual([50, 0]);
  });
});
