import type { IRChild, ScenePrimitive } from '@retikz/core';
import { compileToScene, resolveSpatialHandle } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { expect, it } from 'vitest';

import { ArrayDefinition, MapDefinition } from '../../../src/collection';
import { MatrixDefinition, createMatrix, getMatrixCellId } from '../../../src/collection/matrix';

const base = { namespace: 'standard', type: 'matrix' } as const;
const compile = (child: IRChild) =>
  compileToScene(
    { type: 'scene', version: 1, children: [child] },
    { composites: [MatrixDefinition, ArrayDefinition, MapDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? flat(node.children) : [node]));
it('骨架与显式格输出相同，行列坐标身份独立于标号', () => {
  const props = {
    ...base,
    id: 'm',
    cellIdMode: 'index' as const,
    layout: { width: 30, height: 20 },
    index: { row: { start: 5 }, column: { labels: ['i', 'j'] } },
  };
  const actual = compile(
    createMatrix({
      ...props,
      skeleton: {
        labels: [
          ['a', ''],
          ['a', 'b'],
        ],
      },
    }),
  );
  const expected = compile({
    ...props,
    items: [
      ['a', {}],
      ['a', 'b'],
    ],
  });
  expect(actual.scene).toEqual(expected.scene);
  expect(actual.spatialHandles).toEqual(expected.spatialHandles);
  expect(actual.spatialHandles.entries.filter(e => e.role === 'matrix-cell').map(e => e.id)).toEqual([
    'cell:m-0-0',
    'cell:m-0-1',
    'cell:m-1-0',
    'cell:m-1-1',
  ]);
  expect(getMatrixCellId('m', 2, 3)).toBe('m-2-3');
  expect(() => getMatrixCellId('', 0, 0)).toThrow();
});
it('共享轨道按最大需求确定，固定小格不拉伸，空内容仅保留padding', () => {
  const result = compile({
    ...base,
    id: 'm',
    cellIdMode: 'index',
    items: [
      [{ layout: { width: 10, height: 20 } }, {}],
      [{ layout: { width: 40, height: 30 } }, {}],
    ],
    layout: { gap: { row: 3, column: 5 } },
  });
  const cells = result.spatialHandles.entries.filter(e => e.role === 'matrix-cell').map(e => e.geometry.bounds);
  expect(cells).toEqual([
    { x: 0, y: 0, width: 10, height: 20 },
    { x: 45, y: 0, width: 16, height: 20 },
    { x: 0, y: 23, width: 40, height: 30 },
    { x: 45, y: 23, width: 16, height: 30 },
  ]);
  expect(flat(result.scene.primitives).some(p => p.type === 'text')).toBe(false);
});
it('零轴不生成格子、索引或gap', () => {
  for (const skeleton of [{ rows: 0, columns: 3 }, { rows: 2, columns: 0 }, { labels: [] }]) {
    const result = compile({ ...base, skeleton, index: true });
    expect(flat(result.scene.primitives)).toEqual([]);
    expect(result.spatialHandles.entries.find(e => e.role === 'container')?.geometry.bounds).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  }
});
it('空标号和空索引对象不留下额外空间', () => {
  const props = { ...base, skeleton: { rows: 2, columns: 2 } };
  const plain = compile(props);
  for (const index of [{}, { row: { labels: ['', ''] }, column: { labels: ['', ''] } }])
    expect(compile({ ...props, index }).scene).toEqual(plain.scene);
});
it('JSON只解释格内结构，展开选择不改变矩阵形状', () => {
  const result = compile({ ...base, id: 'm', cellIdMode: 'index', data: [[{ a: [1] }, null]], dataExpand: false });
  expect(result.spatialHandles.entries.filter(e => e.role === 'matrix-cell')).toHaveLength(2);
  expect(
    flat(result.scene.primitives)
      .filter(p => p.type === 'text')
      .map(p => p.lines.map(line => line.text).join('\n')),
  ).toEqual(['{"a":[1]}', 'null']);
});

it('索引带只偏移对应轴，前后位置保持相同总尺寸', () => {
  const source = {
    ...base,
    id: 'm',
    cellIdMode: 'index' as const,
    skeleton: { rows: 2, columns: 2 },
    layout: { width: 30, height: 20, gap: { row: 3, column: 7 } },
  };
  const plain = compile(source);
  const root = (result: ReturnType<typeof compile>) =>
    result.spatialHandles.entries.find(e => e.role === 'container')!.geometry.bounds;
  const cell = (result: ReturnType<typeof compile>) =>
    result.spatialHandles.entries.find(e => e.role === 'matrix-cell')!.geometry.bounds;
  const before = compile({ ...source, index: true });
  const after = compile({ ...source, index: { row: { position: 'after' }, column: { position: 'after' } } });
  expect(root(before)).toEqual(root(after));
  expect(cell(after)).toEqual(cell(plain));
  expect(cell(before).x).toBeGreaterThan(0);
  expect(cell(before).y).toBeGreaterThan(0);
  const rowOnly = compile({ ...source, index: { row: true } });
  expect(root(rowOnly).height).toBe(root(plain).height);
  expect(cell(rowOnly).y).toBe(0);
  const columnOnly = compile({ ...source, index: { column: true } });
  expect(root(columnOnly).width).toBe(root(plain).width);
  expect(cell(columnOnly).x).toBe(0);
});
it('空根保留标签，别名与生成身份经过变换仍共用一个格子记录', () => {
  const empty = compile({
    ...base,
    skeleton: { rows: Number.MAX_SAFE_INTEGER, columns: 0 },
    label: { text: 'M', position: 'top' },
  });
  expect(flat(empty.scene.primitives).some(p => p.type === 'text' && p.lines[0].text === 'M')).toBe(true);
  const result = compile({
    ...base,
    id: 'm',
    cellIdMode: 'index',
    items: [[{ id: 'named', content: 'A' }, { id: 'm-0-1' }]],
    layout: { width: 30, height: 20 },
    transforms: [{ kind: 'translate', x: 7, y: 11 }],
  });
  const generated = resolveSpatialHandle(result.spatialHandles, { id: 'cell:m-0-0' });
  expect(resolveSpatialHandle(result.spatialHandles, { id: 'cell:named' })).toBe(generated);
  expect(generated.geometry.bounds).toEqual({ x: 7, y: 11, width: 30, height: 20 });
  expect(result.spatialHandles.entries.filter(e => e.role === 'matrix-cell')).toHaveLength(2);
  expect(resolveSpatialHandle(result.spatialHandles, { id: 'cell:m-0-1' })).not.toHaveProperty('aliasIds');
});
