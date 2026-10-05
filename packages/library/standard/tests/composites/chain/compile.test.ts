import type { ScenePrimitive } from '@retikz/core';
import type { LayoutProposal, PathPrim } from '@retikz/core';
import {
  ChildSchema,
  CompositeBaseSchema,
  compileToScene,
  defineComposite,
  LayoutChildProbeKind,
  resolveSpatialHandle,
} from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { expect, it } from 'vitest';
import { literal } from 'zod';

import { ChainDefinition, createChain } from '../../../src/collection/chain';

const compile = (input: Parameters<typeof createChain>[0]) =>
  compileToScene(
    { type: 'scene', version: 1, children: [createChain(input)] },
    { composites: [ChainDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const base = { namespace: 'standard', type: 'chain' } as const;
it('奇数空轨道留在末端，JSON 数据不猜测分支结构', () => {
  const result = compile({
    ...base,
    layout: { width: 20, height: 10, gap: 10, justify: 'center' },
    items: [
      'A',
      {
        kind: 'parallel',
        branches: [
          { items: [{ kind: 'cell', id: 'first' }, 'B', 'C', 'D'] },
          { items: [{ kind: 'cell', id: 'short' }] },
        ],
      },
      'E',
    ],
  });
  const first = resolveSpatialHandle(result.spatialHandles, { id: 'cell:first' }).geometry.bounds;
  const short = resolveSpatialHandle(result.spatialHandles, { id: 'cell:short' }).geometry.bounds;
  expect(short.x - first.x).toBe(30);
  const value = { kind: 'parallel', branches: [['A'], ['B']] };
  const data = compile({ ...base, data: [value], dataExpand: false });
  const texts = flat(data.scene.primitives).filter(p => p.type === 'text');
  expect(texts).toHaveLength(1);
  expect(texts[0].lines[0].text).toBe(JSON.stringify(value));
});
it('外部路径连接显式单元边框，局部命名空间隔离同名内容', () => {
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        createChain({
          ...base,
          items: [{ kind: 'cell', id: 'target' }],
          layout: { width: 20, height: 10 },
          transforms: [{ kind: 'translate', x: 7, y: 11 }],
        }),
        {
          type: 'path',
          style: { stroke: 'red' },
          meta: { external: true },
          children: [
            { type: 'step', kind: 'move', to: [50, 16] },
            { type: 'step', kind: 'line', to: { id: 'target', anchor: 'right' } },
          ],
        },
        createChain({
          ...base,
          id: 'local',
          localNamespace: true,
          items: [{ kind: 'cell', id: 'target' }],
          transforms: [{ kind: 'translate', x: 100, y: 0 }],
        }),
      ],
    },
    { composites: [ChainDefinition], clips: [PathClipDefinition] },
  );
  const path = flat(result.scene.primitives).find(p => p.type === 'path' && p.meta?.external === true);
  expect(path?.type).toBe('path');
  if (path?.type === 'path') expect(path.commands.at(-1)).toEqual({ kind: 'line', to: [27, 16] });
  expect(result.spatialHandles.entries.filter(e => e.id === 'cell:target')).toHaveLength(2);
});
it('共享轨道采用实际相邻项的间距需求，允许嵌套块缩小局部间距', () => {
  const result = compile({
    ...base,
    layout: { width: 20, height: 10, gap: 24 },
    items: [
      'Root',
      {
        kind: 'parallel',
        branches: [
          {
            items: [
              'A',
              {
                kind: 'parallel',
                layout: { gap: 6 },
                branches: [{ items: ['B', { kind: 'cell', id: 'last' }] }, { items: ['D'] }],
              },
              { kind: 'cell', id: 'after' },
            ],
          },
          { items: ['Short'] },
        ],
      },
      'End',
    ],
  });
  const last = resolveSpatialHandle(result.spatialHandles, { id: 'cell:last' }).geometry.bounds;
  const after = resolveSpatialHandle(result.spatialHandles, { id: 'cell:after' }).geometry.bounds;
  expect(after.x - last.x - last.width).toBe(6);
});
it('父约束不足时失败，充足空间不拉伸单元或间距', () => {
  const run = (proposal: LayoutProposal) => {
    const harness = defineComposite({
      namespace: 'chain-test',
      type: 'harness',
      schema: CompositeBaseSchema.extend({
        namespace: literal('chain-test'),
        type: literal('harness'),
        child: ChildSchema,
      }),
      compile: (node, context) => {
        const probe = context.layoutChild(node.child, proposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result)] };
      },
    });
    return compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            namespace: 'chain-test',
            type: 'harness',
            child: createChain({
              ...base,
              items: [
                { kind: 'cell', id: 'a' },
                { kind: 'cell', id: 'b' },
              ],
              layout: { width: 20, height: 10, gap: 10 },
            }),
          },
        ],
      },
      { composites: [harness, ChainDefinition], clips: [PathClipDefinition] },
    );
  };
  expect(() => run({ x: { kind: 'exact', value: 40 }, y: { kind: 'exact', value: 20 } })).toThrow();
  const result = run({ x: { kind: 'exact', value: 100 }, y: { kind: 'exact', value: 20 } });
  const first = resolveSpatialHandle(result.spatialHandles, { id: 'cell:a' }).geometry.bounds;
  const second = resolveSpatialHandle(result.spatialHandles, { id: 'cell:b' }).geometry.bounds;
  expect(first.width).toBe(20);
  expect(second.x - first.x).toBe(30);
});
it('不等尺寸步骤保持中心对齐且嵌套块不摊平成全局轨道', () => {
  const result = compile({
    ...base,
    layout: { width: 20, height: 10, gap: 10, branchGap: 10 },
    items: [
      'A',
      {
        kind: 'parallel',
        branches: [
          { items: [{ kind: 'cell', id: 'wide', layout: { width: 80, height: 30 } }, 'B', 'C'] },
          {
            items: [
              { kind: 'cell', id: 'small' },
              { kind: 'parallel', branches: [{ items: ['D', 'E'] }, { items: ['F'] }] },
              'G',
            ],
          },
        ],
      },
      'H',
    ],
  });
  const wide = resolveSpatialHandle(result.spatialHandles, { id: 'cell:wide' }).geometry.bounds;
  const small = resolveSpatialHandle(result.spatialHandles, { id: 'cell:small' }).geometry.bounds;
  expect(small.x + small.width / 2).toBe(wide.x + wide.width / 2);
  expect(small.width).toBe(20);
  expect(wide.width).toBe(80);
  expect(small.y).toBeGreaterThanOrEqual(wide.y + wide.height + 10);
  expect(result.spatialHandles.entries.filter(e => e.role === 'chain-cell')).toHaveLength(2);
  expect(flat(result.scene.primitives).filter(p => p.type === 'text')).toHaveLength(8);
});
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? flat(node.children) : [node]));
const connections = (result: ReturnType<typeof compile>) =>
  flat(result.scene.primitives).filter((p): p is PathPrim => p.type === 'path' && p.meta?.chainConnection === true);
it('正交通道在完整分支之外，纵向与横向互为转置', () => {
  const source = {
    ...base,
    layout: { width: 20, height: 20, gap: 10, branchGap: 10 },
    connection: { path: { marks: [], meta: { chainConnection: true } } },
    items: [
      { kind: 'cell' as const, id: 'a' },
      {
        kind: 'parallel' as const,
        branches: [
          { items: [{ kind: 'cell' as const, id: 'b' }, 'C'] },
          { items: [{ kind: 'cell' as const, id: 'd' }] },
        ],
      },
      { kind: 'cell' as const, id: 'e' },
    ],
  };
  const result = compile(source);
  const paths = connections(result);
  expect(paths).toHaveLength(5);
  expect(paths[0].commands).toEqual([
    { kind: 'move', to: [20, 25] },
    { kind: 'line', to: [25, 25] },
    { kind: 'line', to: [25, 10] },
    { kind: 'line', to: [30, 10] },
  ]);
  expect(paths.at(-1)!.commands).toEqual([
    { kind: 'move', to: [50, 40] },
    { kind: 'line', to: [85, 40] },
    { kind: 'line', to: [85, 25] },
    { kind: 'line', to: [90, 25] },
  ]);
  const down = connections(compile({ ...source, layout: { ...source.layout, direction: 'down' } }));
  expect(down[0].commands).toEqual([
    { kind: 'move', to: [25, 20] },
    { kind: 'line', to: [25, 25] },
    { kind: 'line', to: [10, 25] },
    { kind: 'line', to: [10, 30] },
  ]);
});
it('局部连接覆盖保留样式字段并显式移除箭头', () => {
  const result = compile({
    ...base,
    connection: { path: { meta: { chainConnection: true }, style: { stroke: 'blue', strokeWidth: 3 } } },
    items: [
      'A',
      {
        kind: 'parallel',
        connection: { route: 'straight', path: { marks: [], style: { stroke: 'red' } } },
        branches: [{ items: ['B', 'C'] }, { items: ['D'] }],
      },
      'E',
      'F',
    ],
  });
  const paths = connections(result);
  expect(paths).toHaveLength(6);
  for (const path of paths.slice(0, 5)) {
    expect(path.stroke).toBe('red');
    expect(path.strokeWidth).toBe(3);
    expect(path.arrowEnd).toBeUndefined();
    expect(path.commands).toHaveLength(2);
  }
  expect(paths[5].arrowEnd).toBeDefined();
  expect(paths[5].stroke).toBe('blue');
});
it('空根保持零 allocation 与标签，单单元无连接，变换保留真实引用', () => {
  const empty = compile({ ...base, items: [], label: { text: 'Chain', position: 'top' } });
  expect(empty.spatialHandles.entries.find(e => e.role === 'container')!.geometry.bounds).toMatchObject({
    width: 0,
    height: 0,
  });
  expect(flat(empty.scene.primitives).some(p => p.type === 'text' && p.lines[0].text === 'Chain')).toBe(true);
  const single = compile({
    ...base,
    items: [{ kind: 'cell', id: 'only' }],
    layout: { width: 30, height: 10 },
    transforms: [{ kind: 'rotate', degrees: 90 }],
    connection: { path: { meta: { chainConnection: true } } },
  });
  expect(connections(single)).toHaveLength(0);
  const bounds = resolveSpatialHandle(single.spatialHandles, { id: 'cell:only' }).geometry.bounds;
  expect(bounds.width).toBeCloseTo(10);
  expect(bounds.height).toBeCloseTo(30);
});
it('骨架三表示复用同一单元与连接语义', () => {
  const a = compile({ ...base, skeleton: { count: 3 } });
  expect(a.scene).toEqual(compile({ ...base, skeleton: { labels: ['', '', ''] } }).scene);
  expect(a.scene).toEqual(compile({ ...base, skeleton: { items: ['', '', ''] } }).scene);
});
it('分叉占共享步骤，汇合回主干且只注册真实单元', () => {
  const result = compile({
    ...base,
    layout: { width: 20, height: 10, gap: 10, branchGap: 10 },
    items: [
      { kind: 'cell', id: 'a' },
      {
        kind: 'parallel',
        branches: [
          {
            items: [
              { kind: 'cell', id: 'b' },
              { kind: 'cell', id: 'c' },
            ],
          },
          { items: [{ kind: 'cell', id: 'd' }] },
        ],
      },
      { kind: 'cell', id: 'e' },
    ],
  });
  const cells = result.spatialHandles.entries.filter(e => e.role === 'chain-cell');
  expect(cells).toHaveLength(5);
  const bounds = (id: string) => cells.find(e => e.id === `cell:${id}`)!.geometry.bounds;
  expect(bounds('a').y).toBe(bounds('e').y);
  expect(bounds('b').x).toBe(bounds('d').x);
  expect(bounds('e').x).toBeGreaterThan(bounds('c').x + 20);
});

it('短分支对齐在紧凑与步骤布局下保持真实单元数量', () => {
  for (const spacing of ['compact', 'steps'] as const)
    for (const justify of ['start', 'center', 'end'] as const) {
      const result = compile({
        ...base,
        layout: { width: 20, height: 10, gap: 10, spacing, justify },
        items: [
          'A',
          {
            kind: 'parallel',
            branches: [{ items: [{ kind: 'cell', id: 'b' }, 'C', 'D'] }, { items: [{ kind: 'cell', id: 's' }] }],
          },
          'E',
        ],
      });
      const find = (id: string) => result.spatialHandles.entries.find(e => e.id === `cell:${id}`)!.geometry.bounds;
      expect(find('s').x - find('b').x).toBe(justify === 'start' ? 0 : justify === 'center' ? 30 : 60);
    }
});
it('主干和端部对齐以完整支路包围盒为准', () => {
  for (const branchAlign of ['start', 'center', 'end', { branch: 1 }] as const) {
    const result = compile({
      ...base,
      layout: { width: 20, height: 10, branchGap: 10, branchAlign },
      items: [
        { kind: 'cell', id: 'a' },
        {
          kind: 'parallel',
          branches: [{ items: [{ kind: 'cell', id: 'b' }] }, { items: [{ kind: 'cell', id: 'c' }] }],
        },
        'E',
      ],
    });
    const find = (id: string) => result.spatialHandles.entries.find(e => e.id === `cell:${id}`)!.geometry.bounds;
    expect(find('a').y - find('b').y).toBe(branchAlign === 'start' ? 0 : branchAlign === 'center' ? 10 : 20);
  }
});
it('纵向布局交换主轴但保留单元物理宽高', () => {
  const result = compile({
    ...base,
    layout: { direction: 'down', width: 30, height: 10, gap: 12 },
    items: [
      { kind: 'cell', id: 'a' },
      { kind: 'cell', id: 'b' },
    ],
  });
  const cells = result.spatialHandles.entries.filter(e => e.role === 'chain-cell').map(e => e.geometry.bounds);
  expect(cells[0]).toMatchObject({ width: 30, height: 10 });
  expect(cells[1].y - cells[0].y).toBe(22);
});
it('嵌套并行块局部字段不重置继承的对齐', () => {
  const result = compile({
    ...base,
    layout: { width: 20, height: 10, spacing: 'compact', justify: 'end' },
    items: [
      'A',
      {
        kind: 'parallel',
        layout: { gap: 30 },
        branches: [{ items: [{ kind: 'cell', id: 'long' }, 'B'] }, { items: [{ kind: 'cell', id: 'short' }] }],
      },
      'E',
    ],
  });
  const find = (id: string) => result.spatialHandles.entries.find(e => e.id === `cell:${id}`)!.geometry.bounds;
  expect(find('short').x - find('long').x).toBe(50);
});
it('递归骨架与显式结构的图形完全一致', () => {
  const nested = { branches: [['B', { branches: [['C'], ['D']] }, 'E'], ['F']] };
  expect(compile({ ...base, skeleton: { items: ['A', nested, 'G'] } }).scene).toEqual(
    compile({
      ...base,
      items: [
        'A',
        {
          kind: 'parallel',
          branches: [
            { items: ['B', { kind: 'parallel', branches: [{ items: ['C'] }, { items: ['D'] }] }, 'E'] },
            { items: ['F'] },
          ],
        },
        'G',
      ],
    }).scene,
  );
});
