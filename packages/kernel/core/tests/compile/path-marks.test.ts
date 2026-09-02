import { curve } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { IRPath, IRScene, ScenePrimitive } from '../../src';
import type { ArrowDefinition } from '../../src/contract';

import { compileToScene } from '../../src/compile/compile';
import { flattenPrims } from '../helpers/flatten';

type TestArrowDefinition = Omit<ArrowDefinition, 'name'> & { name?: string };

/** flatten 后非 group 的叶子 primitive 数（marker 产出体现为新增叶子 / group） */
const leafCount = (prims: ReadonlyArray<ScenePrimitive>): number => flattenPrims(prims).length;

const linePathIR = (marks?: IRPath['marks']): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      ...(marks !== undefined ? { marks } : {}),
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    },
  ],
});

describe('marks → 中段 marker primitive', () => {
  it('单个中点 mark 比无 mark 多产 primitive', () => {
    const without = leafCount(compileToScene(linePathIR()).scene.primitives);
    const withMark = leafCount(
      compileToScene(linePathIR([{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }])).scene.primitives,
    );
    expect(withMark).toBeGreaterThan(without);
  });

  it('两个 mark 比一个 mark 再多产 primitive', () => {
    const one = leafCount(compileToScene(linePathIR([{ pos: 0.5, mark: { kind: 'arrow' } }])).scene.primitives);
    const two = leafCount(
      compileToScene(
        linePathIR([
          { pos: 0.25, mark: { kind: 'arrow' } },
          { pos: 0.75, mark: { kind: 'arrow' } },
        ]),
      ).scene.primitives,
    );
    expect(two).toBeGreaterThan(one);
  });

  it('mark 用自定义箭头名 → 注入注册表后编译不抛、产 marker', () => {
    const ir = linePathIR([{ pos: 0.5, mark: { kind: 'arrow', shape: 'myTip' } }]);
    const customArrow: Record<string, TestArrowDefinition> = {
      myTip: {
        lineContactX: 0,
        emit: () => [
          {
            type: 'path',
            commands: [
              { kind: 'move', to: [0, 0] },
              { kind: 'line', to: [6, 3] },
              { kind: 'line', to: [0, 6] },
              { kind: 'close' },
            ],
            fill: { kind: 'contextStroke' },
          },
        ],
      },
    };
    const without = leafCount(compileToScene(linePathIR()).scene.primitives);
    const withMark = leafCount(
      compileToScene(ir, { arrows: Object.entries(customArrow).map(([name, definition]) => ({ ...definition, name })) })
        .scene.primitives,
    );
    expect(withMark).toBeGreaterThan(without);
  });

  it('centered label interruption leaves a middle mark sampled on the logical path', () => {
    const base: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: '#13579b',
          label: { text: 'gap', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const withMark: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: '#13579b',
          label: { text: 'gap', sloped: true },
          marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }],
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const options = { measureText: () => ({ width: 20, height: 10 }) };
    const basePrimitives = compileToScene(base, options).scene.primitives;
    const markedPrimitives = compileToScene(withMark, options).scene.primitives;
    const fragments = flattenPrims(markedPrimitives).filter(
      primitive => primitive.type === 'path' && primitive.stroke === '#13579b',
    );

    expect(fragments).toHaveLength(2);
    expect(leafCount(markedPrimitives)).toBeGreaterThan(leafCount(basePrimitives));
  });
});

describe('marks → 中段 marker 随 strokeWidth 缩放（与端点箭头一致，parser sugar 语义）', () => {
  const markPathIR = (strokeWidth?: number): IRScene => ({
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'path',
        ...(strokeWidth !== undefined ? { strokeWidth } : {}),
        marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }],
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
    ],
  });

  /** 取中段 mark group 的 scale.x（plain line path 无 rotate/scale 时唯一带 scale 的 group 即 mark group） */
  const markScaleX = (ir: IRScene): number => {
    const find = (list: ReadonlyArray<ScenePrimitive>): number | undefined => {
      for (const p of list) {
        if (p.type === 'group') {
          const s = p.transforms?.find(t => t.kind === 'scale');
          if (s && 'x' in s && typeof s.x === 'number') return s.x;
          const inner = find(p.children);
          if (inner !== undefined) return inner;
        }
      }
      return undefined;
    };
    const x = find(compileToScene(ir).scene.primitives);
    if (x === undefined) throw new Error('no mark scale group found');
    return x;
  };

  it('strokeWidth=2 的中段 mark scale ≈ strokeWidth=1 的 2 倍', () => {
    const base = markScaleX(markPathIR(1));
    const thick = markScaleX(markPathIR(2));
    expect(thick / base).toBeCloseTo(2, 1);
  });

  it('strokeWidth=3 的中段 mark scale ≈ 基准的 3 倍', () => {
    const base = markScaleX(markPathIR(1));
    const thick = markScaleX(markPathIR(3));
    expect(thick / base).toBeCloseTo(3, 1);
  });

  it('缺省 strokeWidth 等价于 strokeWidth=1（默认行为不变）', () => {
    expect(markScaleX(markPathIR())).toBeCloseTo(markScaleX(markPathIR(1)), 5);
  });
});

describe('段几何采样契约（marks 定向依赖的机器）', () => {
  it('直线段中点 tangent 沿线方向', () => {
    const s = curve.sampleAt({ kind: 'line', from: [0, 0], to: [10, 0] }, 0.5);
    expect(s.point[0]).toBeCloseTo(5, 6);
    expect(s.point[1]).toBeCloseTo(0, 6);
    expect(s.tangent[0]).toBeCloseTo(1, 6);
    expect(s.tangent[1]).toBeCloseTo(0, 6);
  });

  it('cubic 段中点 tangent 与解析导数一致（曲线 mark 定向）', () => {
    // 对称上拱 cubic：from(0,0) c1(0,-10) c2(10,-10) to(10,0)，中点切线水平向 +x
    const s = curve.sampleAt(
      { kind: 'cubicBezier', from: [0, 0], control1: [0, -10], control2: [10, -10], to: [10, 0] },
      0.5,
    );
    expect(s.tangent[0]).toBeCloseTo(1, 6);
    expect(s.tangent[1]).toBeCloseTo(0, 6);
  });

  it('arc 段 tangent 垂直于半径（圆弧 mark 定向）', () => {
    // 圆心(0,0) r=10，t=0 在 startAngle=0 (+x 轴)，CCW 扫向 90°，起点切线沿 +y
    const s = curve.sampleAt({ kind: 'arc', center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: 90 }, 0);
    expect(s.point[0]).toBeCloseTo(10, 6);
    expect(s.point[1]).toBeCloseTo(0, 6);
    expect(s.tangent[0]).toBeCloseTo(0, 6);
    expect(s.tangent[1]).toBeCloseTo(1, 6);
  });

  it('arc 段中点 tangent 方向正确（45° 处切线垂直半径）', () => {
    const s = curve.sampleAt({ kind: 'arc', center: [0, 0], radius: 10, startAngleDeg: 0, endAngleDeg: 90 }, 0.5);
    // 45° 点切线 = (-sin45, cos45)
    expect(s.tangent[0]).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(s.tangent[1]).toBeCloseTo(Math.SQRT1_2, 6);
  });
});
