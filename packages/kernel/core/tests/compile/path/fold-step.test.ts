import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../../src/compile/compile';
import type { IRScene } from '../../../src/schemas';
import { flattenPrims } from '../../helpers/flatten';
import { line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'step' 折角", () => {
  it("via '-|' 等价于 line(curr.x, prev.y) → line(curr) 拆解", () => {
    const folded: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '-|', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] }, // 先水平
            { type: 'step', kind: 'line', to: [10, 5] }, // 再垂直
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(folded).scene.primitives).commands).toEqual(
      findPathPrim(compileToScene(manual).scene.primitives).commands,
    );
  });

  it("via '|-' 等价于 line(prev.x, curr.y) → line(curr) 拆解", () => {
    const folded: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '|-', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 5] }, // 先垂直
            { type: 'step', kind: 'line', to: [10, 5] }, // 再水平
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(folded).scene.primitives).commands).toEqual(
      findPathPrim(compileToScene(manual).scene.primitives).commands,
    );
  });

  it('折角中间点参与 layout 计算（不会被裁掉）', () => {
    // 起点 (0,0)，终点 (40, 30)，via='-|' → 中点 (40, 0)
    // 三个点的 bbox: x in [0,40], y in [0,30]；padding=10 → layout [-10,-10,60,50]
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '-|', to: [40, 30] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { padding: 10 }).scene;

    expect(scene.layout).toEqual({ x: -10, y: -10, width: 60, height: 50 });
  });

  it('折角与节点引用配合：节点 ref 端点贴 boundary 后再插中点', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
        },
        {
          type: 'node',
          id: 'B',
          position: [100, 60],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const commands = findPathPrim(scene.primitives).commands;

    expect(commands.map(c => c.kind)).toEqual(['move', 'line', 'line']); // M start, L corner, L end
  });

  it('折角中点对齐节点几何中心，不取 boundary 偏移（bugfix）', () => {
    // A=(0,0)，B=(100,60)，无文本默认 width=height=2*padding=16
    // 期望 corner = (B.center.x=100, A.center.y=0)
    // A 端点向 (100, 0) 切 boundary → A.right = (8, 0)
    // B 端点向 (100, 0) 切 boundary → B.top = (100, 52)
    // 路径："M 8 0 L 100 0 L 100 52"
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([
      move([8, 0]),
      line([100, 0]),
      line([100, 52]),
    ]);
  });

  it("via '|-' 中点对齐：corner = (A.center.x, B.center.y)", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '|-', to: { id: 'B' } },
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([
      move([0, 8]),
      line([0, 60]),
      line([92, 60]),
    ]);
  });

  it('两段 fold 在同轴退化时连接两端边界', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [0, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([move([0, 8]), line([0, 52])]);
  });

  it.each([
    {
      via: '-|-' as const,
      fraction: undefined,
      expected: [move([0, 0]), line([50, 0]), line([50, 60]), line([100, 60])],
    },
    {
      via: '|-|' as const,
      fraction: 0.25,
      expected: [move([0, 0]), line([0, 15]), line([100, 15]), line([100, 60])],
    },
  ])('三段 via=$via 按 fraction 插入两个转折点', ({ via, fraction, expected }) => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'fold',
              via,
              ...(fraction !== undefined && { fraction }),
              to: [100, 60],
            },
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual(expected);
  });

  it.each([
    {
      fraction: 0,
      expected: [move([0, 8]), line([0, 60]), line([92, 60])],
    },
    {
      fraction: 1,
      expected: [move([8, 0]), line([100, 0]), line([100, 52])],
    },
  ])('fraction=$fraction 在 NodeTarget 边界移除零长腿且不画到中心', ({ fraction, expected }) => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '-|-', fraction, to: { id: 'B' } },
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual(expected);
  });

  it('三段 fold 从 arc 的真实 pen override 续接', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
            { type: 'step', kind: 'fold', via: '-|-', to: [100, 60] },
          ],
        },
      ],
    };
    const tail = findPathPrim(compileToScene(ir).scene.primitives).commands.slice(-3);

    expect(tail.map(command => command.kind)).toEqual(['line', 'line', 'line']);

    if (tail[0].kind !== 'line' || tail[1].kind !== 'line' || tail[2].kind !== 'line') {
      throw new Error('expected three fold line commands');
    }

    expect(tail[0].to[0]).toBeCloseTo(50, 8);
    expect(tail[0].to[1]).toBeCloseTo(10, 8);
    expect(tail[1].to[0]).toBeCloseTo(50, 8);
    expect(tail[1].to[1]).toBeCloseTo(60, 8);
    expect(tail[2].to).toEqual([100, 60]);
  });

  it('反向坐标仍按 source→target fraction 插值', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [100, 60] },
            { type: 'step', kind: 'fold', via: '-|-', fraction: 0.25, to: [0, 0] },
          ],
        },
      ],
    };

    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([
      move([100, 60]),
      line([75, 60]),
      line([75, 0]),
      line([0, 0]),
    ]);
  });
});

it.each([
  { via: '-|' as const, target: [100, 5] as [number, number], expected: [move([8, 0]), line([92, 0])] },
  { via: '|-' as const, target: [100, 5] as [number, number], expected: [move([8, 5]), line([92, 5])] },
  { via: '-|' as const, target: [5, 100] as [number, number], expected: [move([5, 8]), line([5, 92])] },
  { via: '|-' as const, target: [5, 100] as [number, number], expected: [move([0, 8]), line([0, 92])] },
  { via: '-|' as const, target: [100, 0] as [number, number], expected: [move([8, 0]), line([92, 0])] },
  { via: '|-' as const, target: [100, 0] as [number, number], expected: [move([8, 0]), line([92, 0])] },
])('两段 $via 移除节点内部转折点并保留原路线', ({ via, target, expected }) => {
  const result = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      { type: 'node', id: 'A', position: [0, 0] },
      { type: 'node', id: 'B', position: target },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'A' } },
          { type: 'step', kind: 'fold', via, to: { id: 'B' } },
        ],
      },
    ],
  });
  expect(findPathPrim(result.scene.primitives).commands).toEqual(expected);
});

it.each([
  { fraction: 0.04, expected: [move([4, 8]), line([4, 60]), line([92, 60])] },
  { fraction: 0.96, expected: [move([8, 0]), line([96, 0]), line([96, 52])] },
])('三段折线 fraction=$fraction 裁掉节点内部的转折部分', ({ fraction, expected }) => {
  const result = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      { type: 'node', id: 'A', position: [0, 0] },
      { type: 'node', id: 'B', position: [100, 60] },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'A' } },
          { type: 'step', kind: 'fold', via: '-|-', fraction, to: { id: 'B' } },
        ],
      },
    ],
  });
  expect(findPathPrim(result.scene.primitives).commands).toEqual(expected);
});

it('折线沿原水平段与椭圆相交，不能用中心连线替代', () => {
  const result = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      { type: 'node', id: 'A', position: [0, 0] },
      {
        type: 'node',
        id: 'B',
        shape: 'ellipse',
        position: [100, 6],
        layout: { minimumSize: { width: 20, height: 20 }, padding: 0 },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'A' } },
          { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
        ],
      },
    ],
  });
  expect(findPathPrim(result.scene.primitives).commands).toEqual([move([8, 0]), line([92, 0])]);
});

it('折线裁切使用含非对称 margin 的连接面，反向连接仍正确', () => {
  const result = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      { type: 'node', id: 'A', position: [100, 0] },
      { type: 'node', id: 'B', position: [0, 5], layout: { margin: { top: 2, right: 12, bottom: 4, left: 6 } } },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'A' } },
          { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
        ],
      },
    ],
  });
  expect(findPathPrim(result.scene.primitives).commands).toEqual([move([92, 0]), line([20, 0])]);
});

it('显式 center anchor 保留作者端点，不进行节点内部裁切', () => {
  const result = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      { type: 'node', id: 'A', position: [0, 0] },
      { type: 'node', id: 'B', position: [100, 5] },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'A', anchor: 'center' } },
          { type: 'step', kind: 'fold', via: '-|', to: { id: 'B', anchor: 'center' } },
        ],
      },
    ],
  });
  expect(findPathPrim(result.scene.primitives).commands).toEqual([move([0, 0]), line([100, 0]), line([100, 5])]);
});

it('折线退化后标签与双向箭头沿可见直线采样', () => {
  const children: IRScene['children'] = [
    { type: 'node', id: 'A', position: [0, 0] },
    { type: 'node', id: 'B', position: [100, 5] },
  ];
  const marks = [
    { pos: 0, mark: { kind: 'arrow' as const } },
    { pos: 1, mark: { kind: 'arrow' as const } },
  ];
  const actual = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      ...children,
      {
        type: 'path',
        marks,
        children: [
          { type: 'step', kind: 'move', to: { id: 'A' } },
          { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' }, label: { text: 'mid' } },
        ],
      },
    ],
  }).scene;
  const expected = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'path',
        marks,
        children: [
          { type: 'step', kind: 'move', to: [8, 0] },
          { type: 'step', kind: 'line', to: [92, 0], label: { text: 'mid' } },
        ],
      },
    ],
  }).scene;
  expect(findPathPrim(actual.primitives).commands).toEqual(findPathPrim(expected.primitives).commands);
  expect(findPathPrim(actual.primitives).arrowStart).toEqual(findPathPrim(expected.primitives).arrowStart);
  expect(findPathPrim(actual.primitives).arrowEnd).toEqual(findPathPrim(expected.primitives).arrowEnd);
  expect(flattenPrims(actual.primitives).filter(item => item.type === 'text')).toEqual(
    flattenPrims(expected.primitives).filter(item => item.type === 'text'),
  );
});

it('折线在自身 Scope 坐标中裁切外部节点，保持变换后的边界交点', () => {
  const result = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      { type: 'node', id: 'A', position: [0, 0] },
      { type: 'node', id: 'B', position: [100, 5] },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 20, y: 30 }],
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A' } },
              { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
            ],
          },
        ],
      },
    ],
  });
  expect(findPathPrim(flattenPrims(result.scene.primitives)).commands).toEqual([move([-12, -30]), line([72, -30])]);
});
