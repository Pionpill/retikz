import { compileToScene, ChildSchema, CompositeBaseSchema, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import type { ScenePrimitive, LayoutProposal, LayoutChildResult } from '@retikz/core';
import { expect, it } from 'vitest';
import { literal } from 'zod';

import { TreeDefinition } from '../../../src/collection/tree/definition';
import type { IRTree } from '../../../src/collection/tree/schema';

const base = { namespace: 'standard', type: 'tree' } as const;
const compile = (tree: IRTree) =>
  compileToScene({ type: 'scene', version: 1, children: [tree] }, { composites: [TreeDefinition], padding: 0 });
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(n => (n.type === 'group' ? flat(n.children) : [n]));
it('字符串叶节点与对象配置产生相同图形', () => {
  expect(compile({ ...base, root: 'A' }).scene).toEqual(compile({ ...base, root: { content: 'A' } }).scene);
  expect(compile({ ...base, root: { content: 'A', children: [null, 'B'] } }).scene).toEqual(
    compile({ ...base, root: { content: 'A', children: [null, { content: 'B' }] } }).scene,
  );
});
it.each(['down', 'up', 'right', 'left'] as const)('%s保留空子槽，连接隐藏不影响节点分配', direction => {
  const source: IRTree = {
    ...base,
    root: { id: 'parent', content: 'A', children: [null, { id: 'child', content: 'B' }] },
    layout: { direction },
  };
  const result = compile(source);
  const hidden = compile({ ...source, connection: false });
  expect(result.spatialHandles).toEqual(hidden.spatialHandles);
  const texts = flat(result.scene.primitives).filter(n => n.type === 'text');
  expect(texts).toHaveLength(2);
});
it('null 根为空树且不产生图元', () => {
  const empty = compile({ ...base, root: null });
  expect(flat(empty.scene.primitives)).toHaveLength(0);
});

it('圆形连接命中真实边界，外部引用保留节点身份', () => {
  const tree: IRTree = {
    ...base,
    node: { layout: { padding: 0, minimumSize: 36 } },
    root: { id: 'p', content: '1', children: [{ id: 'c', content: '2' }] },
    connection: { path: { meta: { edge: true } } },
  };
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        tree,
        {
          type: 'path',
          meta: { external: true },
          children: [
            { type: 'step', kind: 'move', to: [100, 18] },
            { type: 'step', kind: 'line', to: { id: 'p', anchor: 'right' } },
          ],
        },
      ],
    },
    { composites: [TreeDefinition] },
  );
  const paths = flat(result.scene.primitives).filter(n => n.type === 'path');
  const edge = paths.find(n => n.meta?.edge);
  expect(edge?.commands).toEqual([
    { kind: 'move', to: [18, 36] },
    { kind: 'line', to: [18, 68] },
  ]);
  expect(paths.find(n => n.meta?.external)?.commands.at(-1)).toEqual({ kind: 'line', to: [36, 18] });
});
it('逐边覆盖可以重新开启、清空箭头', () => {
  const enabled = compile({
    ...base,
    connection: false,
    root: { children: [{ content: 'a', connection: { path: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] } } }, 'b'] },
  });
  expect(flat(enabled.scene.primitives).filter(n => n.type === 'path' && n.arrowEnd !== undefined)).toHaveLength(1);
  const cleared = compile({
    ...base,
    connection: { path: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] } },
    root: { children: [{ connection: { path: { marks: [] } } }] },
  });
  expect(flat(cleared.scene.primitives).filter(n => n.type === 'path' && n.arrowEnd !== undefined)).toHaveLength(0);
});
it.each(['straight', '-|', '|-', '-|-', '|-|'] as const)('%s 连接与直接引用节点的 Core 路径等价', route => {
  for (const direction of ['down', 'up', 'right', 'left'] as const) {
    const connection = route === '-|-' || route === '|-|' ? { route, fraction: 0.3 } : { route };
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            ...base,
            layout: { direction },
            root: {
              id: 'parent',
              content: 'A',
              children: [
                null,
                {
                  id: 'child',
                  content: 'Long rounded rectangle',
                  node: { shape: { type: 'rectangle', params: { cornerRadius: 8 } } },
                },
              ],
            },
            connection: { ...connection, path: { meta: { edge: true } } },
          },
          {
            type: 'path',
            meta: { reference: true },
            children: [
              { type: 'step', kind: 'move', to: { id: 'parent' } },
              route === 'straight'
                ? { type: 'step', kind: 'line', to: { id: 'child' } }
                : {
                    type: 'step',
                    kind: 'fold',
                    via: route,
                    ...(route === '-|-' || route === '|-|' ? { fraction: 0.3 } : {}),
                    to: { id: 'child' },
                  },
            ],
          },
        ],
      },
      { composites: [TreeDefinition] },
    );
    const paths = flat(result.scene.primitives).filter(n => n.type === 'path');
    expect(paths.find(n => n.meta?.edge)?.commands).toEqual(paths.find(n => n.meta?.reference)?.commands);
  }
});

it.each(['circle', 'ellipse', 'diamond', 'rectangle'] as const)('%s 带不对称留白的边与真实外部引用等价', shape => {
  const source: IRTree = {
    ...base,
    node: { shape, layout: { margin: { left: 3, right: 7, top: 2, bottom: 9 }, padding: { left: 4, right: 16 } } },
    root: { id: 'p', content: 'wide parent', children: [{ id: 'c', content: 'child' }] },
    connection: { path: { meta: { edge: true } } },
  };
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        source,
        {
          type: 'path',
          meta: { reference: true },
          children: [
            { type: 'step', kind: 'move', to: { id: 'p' } },
            { type: 'step', kind: 'line', to: { id: 'c' } },
          ],
        },
      ],
    },
    { composites: [TreeDefinition] },
  );
  const paths = flat(result.scene.primitives).filter(n => n.type === 'path');
  expect(paths.find(n => n.meta?.edge)?.commands).toEqual(paths.find(n => n.meta?.reference)?.commands);
});
it('空子槽保留默认节点宽度及子树净距，唯一子节点居中', () => {
  const centers = (missing: boolean) => {
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            ...base,
            node: { layout: { padding: 0, minimumSize: 36 } },
            root: { id: 'p', children: [...(missing ? [null] : []), { id: 'c' }] },
          },
          {
            type: 'path',
            meta: { measure: true },
            children: [
              { type: 'step', kind: 'move', to: { id: 'p', anchor: 'center' } },
              { type: 'step', kind: 'line', to: { id: 'c', anchor: 'center' } },
            ],
          },
        ],
      },
      { composites: [TreeDefinition] },
    );
    return flat(result.scene.primitives).find(n => n.type === 'path' && n.meta?.measure);
  };
  const single = centers(false);
  const missing = centers(true);
  expect(single?.type === 'path' && single.commands).toEqual([
    { kind: 'move', to: [18, 18] },
    { kind: 'line', to: [18, 86] },
  ]);
  expect(missing?.type === 'path' && missing.commands).toEqual([
    { kind: 'move', to: [48, 18] },
    { kind: 'line', to: [78, 86] },
  ]);
});
it('多个匿名树的内部引用互不冲突，根变换保留实际节点引用', () => {
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        { ...base, root: { children: ['a', 'b'] } },
        {
          ...base,
          node: { layout: { padding: 0, minimumSize: 36 } },
          transforms: [{ kind: 'translate', x: 200, y: 100 }],
          root: { id: 'shifted', children: ['c'] },
        },
        {
          type: 'path',
          meta: { external: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'shifted', anchor: 'center' } },
          ],
        },
      ],
    },
    { composites: [TreeDefinition] },
  );
  const edge = flat(result.scene.primitives).find(n => n.type === 'path' && n.meta?.external);
  expect(edge?.type === 'path' && edge.commands.at(-1)).toEqual({ kind: 'line', to: [218, 118] });
});

it('父分配保留自然节点尺寸，过小约束失败', () => {
  const probe = (proposal: LayoutProposal) => {
    let measured: LayoutChildResult | undefined;
    const harness = defineComposite({
      namespace: 'tree-test',
      type: 'harness',
      schema: CompositeBaseSchema.extend({
        namespace: literal('tree-test'),
        type: literal('harness'),
        child: ChildSchema,
      }),
      compile: (source, context) => {
        const result = context.layoutChild(source.child, proposal);
        if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);
        measured = result.result;
        return { children: [context.replay(result.result)] };
      },
    });
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            namespace: 'tree-test',
            type: 'harness',
            child: { ...base, root: {}, node: { layout: { padding: 0, minimumSize: 36 } } },
          },
        ],
      },
      { composites: [TreeDefinition, harness] },
    );
    return measured?.allocationBounds;
  };
  expect(probe({ x: { kind: 'exact', value: 100 }, y: { kind: 'range', min: 80, max: 100 } })).toEqual({
    x: 0,
    y: 0,
    width: 100,
    height: 80,
  });
  expect(() => probe({ x: { kind: 'exact', value: 10 }, y: { kind: 'exact', value: 10 } })).toThrow();
});
it('非均匀子树不重叠，同层中心对齐且兄弟顺序稳定', () => {
  for (const direction of ['down', 'up', 'right', 'left'] as const) {
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            ...base,
            layout: { direction },
            node: { layout: { padding: 0, minimumSize: 36 } },
            root: { children: [{ id: 'a', node: { layout: { minimumSize: 80 } } }, { id: 'b' }] },
          },
          {
            type: 'path',
            meta: { centers: true },
            children: [
              { type: 'step', kind: 'move', to: { id: 'a', anchor: 'center' } },
              { type: 'step', kind: 'line', to: { id: 'b', anchor: 'center' } },
            ],
          },
        ],
      },
      { composites: [TreeDefinition] },
    );
    const edge = flat(result.scene.primitives).find(n => n.type === 'path' && n.meta?.centers);
    if (edge?.type !== 'path') throw new Error('Missing center evidence');
    const [a, b] = edge.commands;
    if (a.kind !== 'move' || b.kind !== 'line') throw new Error('Unexpected center evidence');
    const main = direction === 'down' || direction === 'up' ? 1 : 0;
    const cross = main === 1 ? 0 : 1;
    expect(a.to[main]).toBe(b.to[main]);
    expect(b.to[cross] - a.to[cross]).toBe(40 + 24 + 18);
  }
});
it('根容器引用和整体标签保留', () => {
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        {
          ...base,
          id: 'tree-container',
          root: {},
          node: { layout: { padding: 0, minimumSize: 36 } },
          label: { text: 'Tree' },
        },
        {
          type: 'path',
          meta: { container: true },
          children: [
            { type: 'step', kind: 'move', to: [100, 18] },
            { type: 'step', kind: 'line', to: { id: 'tree-container', anchor: 'right' } },
          ],
        },
      ],
    },
    { composites: [TreeDefinition] },
  );
  expect(flat(result.scene.primitives).some(n => n.type === 'text')).toBe(true);
  expect(flat(result.scene.primitives).some(n => n.meta?.container)).toBe(true);
});

it('继承节点旋转时直线仍与真实形状边界相接', () => {
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        {
          ...base,
          defaults: { node: { rotate: 30 } },
          node: { shape: 'ellipse', layout: { margin: { left: 3, right: 7 }, padding: 0 } },
          root: { id: 'rotated-parent', content: 'long parent', children: [{ id: 'rotated-child', content: 'child' }] },
          connection: { path: { meta: { edge: true } } },
        },
        {
          type: 'path',
          meta: { reference: true },
          children: [
            { type: 'step', kind: 'move', to: { id: 'rotated-parent' } },
            { type: 'step', kind: 'line', to: { id: 'rotated-child' } },
          ],
        },
      ],
    },
    { composites: [TreeDefinition] },
  );
  const paths = flat(result.scene.primitives).filter(n => n.type === 'path');
  const actual = paths.find(n => n.meta?.edge)?.commands;
  const expected = paths.find(n => n.meta?.reference)?.commands;
  expect(actual).toEqual(expected);
});

it.each(['down', 'up', 'right', 'left'] as const)('%s 父节点居于直属子节点中心之间，不受后代包络偏移', direction => {
  const root = {
    id: 'a',
    content: 'A',
    children: [
      { id: 'b', content: 'B' },
      { id: 'c', content: 'C', children: [null, { id: 'd', content: 'D' }] },
    ],
  };
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        { ...base, root, layout: { direction } },
        ...['a', 'b', 'c', 'd'].map(id => ({
          type: 'path' as const,
          meta: { center: id },
          children: [
            { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
            { type: 'step' as const, kind: 'line' as const, to: { id, anchor: 'center' } },
          ],
        })),
      ],
    },
    { composites: [TreeDefinition] },
  );
  const coordinate = (id: string) => {
    const path = flat(result.scene.primitives).find(node => node.type === 'path' && node.meta?.center === id);
    if (path?.type !== 'path') throw new Error('Missing node center');
    const command = path.commands.at(-1);
    if (command?.kind !== 'line') throw new Error('Missing center coordinate');
    return command.to[direction === 'down' || direction === 'up' ? 0 : 1];
  };
  expect(coordinate('a')).toBeCloseTo((coordinate('b') + coordinate('c')) / 2, 2);
  expect(coordinate('b')).toBeLessThan(coordinate('c'));
  expect(coordinate('c')).toBeLessThan(coordinate('d'));
});
it('默认单字圆形节点保持 32 的最小尺寸', () => {
  const result = compile({ ...base, root: 'A' });
  expect(result.spatialHandles.entries.find(entry => entry.role === 'container')?.geometry.bounds).toEqual({
    x: 0,
    y: 0,
    width: 32,
    height: 32,
  });
});

it('匿名与显式节点混用时内部引用不冲突，路径保持同图', () => {
  const edges = (named: boolean) => {
    const result = compile({
      ...base,
      root: {
        ...(named ? { id: 'root' } : {}),
        content: 'A',
        children: [
          { id: 'tree-node-0', content: 'B', children: [{ ...(named ? { id: 'leaf' } : {}), content: 'C' }] },
          'D',
        ],
      },
      connection: { route: '-|-', path: { meta: { edge: true } } },
    });
    return flat(result.scene.primitives)
      .filter(n => n.type === 'path')
      .filter(n => n.meta?.edge)
      .map(n => n.commands);
  };
  expect(edges(false)).toHaveLength(3);
  expect(edges(false)).toEqual(edges(true));
});
