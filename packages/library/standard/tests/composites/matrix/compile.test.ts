import type { IRChild, ScenePrimitive } from '@retikz/core';
import { pathClipDefinition } from '@retikz/extension';
import { expect, it } from 'vitest';

import { arrayDefinition, mapDefinition } from '../../../src/collection';
import { createMatrix, getMatrixCellId, matrixDefinition } from '../../../src/collection/matrix';
import { compileMeasured } from '../../helpers/compile-measured';
import { sceneCellBounds, sceneNodeBounds, sceneNodes } from '../../helpers/scene-geometry';

const base = { namespace: 'standard', type: 'matrix' } as const;

const compile = (child: IRChild) =>
  compileMeasured(child, {
    composites: [matrixDefinition, arrayDefinition, mapDefinition],
    clips: [pathClipDefinition],
    padding: 0,
  });

const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? flat(node.children) : [node]));
it('骨架与显式格输出相同，行列坐标身份独立于标号', () => {
  const props = {
    ...base,
    id: 'm',
    cellIdMode: 'index' as const,
    index: { row: { start: 5 }, column: { labels: ['i', 'j'] } },
    defaultCell: { layout: { width: 30, height: 20 } },
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

  expect(
    sceneNodes(actual.scene)
      .flatMap(node => (node.id === undefined ? [] : [node.id]))
      .filter(id => /^(?:values|vector|m)-/.test(id)),
  ).toEqual(['m-0-0', 'm-0-1', 'm-1-0', 'm-1-1']);
  expect(getMatrixCellId('m', 2, 3)).toBe('m-2-3');
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
  const cells = sceneCellBounds(result.scene);

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
    expect(result.allocationBounds).toEqual({
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

  expect(sceneCellBounds(result.scene)).toHaveLength(2);
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
    layout: { gap: { row: 3, column: 7 } },
    defaultCell: { layout: { width: 30, height: 20 } },
  };
  const plain = compile(source);
  const root = (result: ReturnType<typeof compile>) => result.allocationBounds;
  const cell = (result: ReturnType<typeof compile>) => sceneCellBounds(result.scene)[0];
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
    transforms: [{ kind: 'translate', x: 7, y: 11 }],
    defaultCell: { layout: { width: 30, height: 20 } },
  });
  expect(sceneNodeBounds(result.scene, 'm-0-0')).toEqual({ x: 7, y: 11, width: 30, height: 20 });
  expect(sceneCellBounds(result.scene)).toHaveLength(2);
});
