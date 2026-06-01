/**
 * compile：path 中段 marking 行为 + 段几何采样契约测试
 * @description marks 沿路径在 pos∈[0,1] 处放按切线定向的 arrow marker（复用段采样取点 + 切线）。
 *   compile 侧断言：有 marks 比无 marks 多产 primitive，且数量随 mark 个数增长（编译实现尚未消费 marks，
 *   故 compile 组当前应失败，待实现 Agent 落地）。段几何采样契约组直接验证 segment.ts 在直线 / 曲线 / arc
 *   段的切线方向正确（marks 定向所依赖的机器），当前应通过。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { ArrowDefinition } from '../../src/arrows';
import type { IR, IRPath, ScenePrimitive } from '../../src';
import {
  arcSegmentSample,
  cubicSegmentSample,
  lineSegmentSample,
} from '../../src/geometry/segment';
import { flattenPrims } from '../helpers/flatten';

/** flatten 后非 group 的叶子 primitive 数（marker 产出体现为新增叶子 / group） */
const leafCount = (prims: ReadonlyArray<ScenePrimitive>): number =>
  flattenPrims(prims).length;

const linePathIR = (marks?: IRPath['marks']): IR => ({
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
    const without = leafCount(compileToScene(linePathIR()).primitives);
    const withMark = leafCount(
      compileToScene(
        linePathIR([{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }]),
      ).primitives,
    );
    expect(withMark).toBeGreaterThan(without);
  });

  it('两个 mark 比一个 mark 再多产 primitive', () => {
    const one = leafCount(
      compileToScene(
        linePathIR([{ pos: 0.5, mark: { kind: 'arrow' } }]),
      ).primitives,
    );
    const two = leafCount(
      compileToScene(
        linePathIR([
          { pos: 0.25, mark: { kind: 'arrow' } },
          { pos: 0.75, mark: { kind: 'arrow' } },
        ]),
      ).primitives,
    );
    expect(two).toBeGreaterThan(one);
  });

  it('mark 用自定义箭头名 → 注入注册表后编译不抛、产 marker', () => {
    const ir = linePathIR([{ pos: 0.5, mark: { kind: 'arrow', shape: 'myTip' } }]);
    const customArrow: Record<string, ArrowDefinition> = {
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
    const without = leafCount(compileToScene(linePathIR()).primitives);
    const withMark = leafCount(
      compileToScene(ir, { arrows: customArrow }).primitives,
    );
    expect(withMark).toBeGreaterThan(without);
  });
});

describe('段几何采样契约（marks 定向依赖的机器）', () => {
  it('直线段中点 tangent 沿线方向', () => {
    const s = lineSegmentSample([0, 0], [10, 0], 0.5);
    expect(s.point[0]).toBeCloseTo(5, 6);
    expect(s.point[1]).toBeCloseTo(0, 6);
    expect(s.tangent[0]).toBeCloseTo(1, 6);
    expect(s.tangent[1]).toBeCloseTo(0, 6);
  });

  it('cubic 段中点 tangent 与解析导数一致（曲线 mark 定向）', () => {
    // 对称上拱 cubic：from(0,0) c1(0,-10) c2(10,-10) to(10,0)，中点切线水平向 +x
    const s = cubicSegmentSample([0, 0], [0, -10], [10, -10], [10, 0], 0.5);
    expect(s.tangent[0]).toBeCloseTo(1, 6);
    expect(s.tangent[1]).toBeCloseTo(0, 6);
  });

  it('arc 段 tangent 垂直于半径（圆弧 mark 定向）', () => {
    // 圆心(0,0) r=10，t=0 在 startAngle=0 (+x 轴)，CCW 扫向 90°，起点切线沿 +y
    const s = arcSegmentSample([0, 0], 10, 0, 90, 0);
    expect(s.point[0]).toBeCloseTo(10, 6);
    expect(s.point[1]).toBeCloseTo(0, 6);
    expect(s.tangent[0]).toBeCloseTo(0, 6);
    expect(s.tangent[1]).toBeCloseTo(1, 6);
  });

  it('arc 段中点 tangent 方向正确（45° 处切线垂直半径）', () => {
    const s = arcSegmentSample([0, 0], 10, 0, 90, 0.5);
    // 45° 点切线 = (-sin45, cos45)
    expect(s.tangent[0]).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(s.tangent[1]).toBeCloseTo(Math.SQRT1_2, 6);
  });
});
