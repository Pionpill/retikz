import type { IRChild } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { expect, it } from 'vitest';

import {
  ArrayDefinition,
  MapDefinition,
  MatrixDefinition,
  ChainDefinition,
  TreeDefinition,
} from '../../../src/collection';
import { createDataCell } from '../../../src/collection/_cell/data';
import { resolveCell } from '../../../src/collection/_cell/resolve';

const nested: Array<IRChild> = [
  { namespace: 'standard', type: 'array', items: ['A'] },
  { namespace: 'standard', type: 'map', entries: [{ key: 'K', value: 'V' }] },
  { namespace: 'standard', type: 'matrix', items: [['A']] },
  { namespace: 'standard', type: 'chain', items: ['A'] },
  { namespace: 'standard', type: 'tree', root: 'A' },
];

it('嵌套集合默认没有外层填充与内边距，保留原始内容和 Source', () => {
  for (const content of nested) {
    const source = { content };
    const before = JSON.stringify(source);
    const cell = resolveCell(source, {});
    expect(cell.style.fill).toBe('none');
    expect(cell.layout.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(cell.content).toBe(content);
    expect(JSON.stringify(source)).toBe(before);
  }
});

it('文本、空格与非集合绘图内容保留原默认样式', () => {
  for (const content of [
    'A',
    undefined,
    { type: 'node', position: [0, 0], text: 'A' } satisfies IRChild,
    { namespace: 'other', type: 'array' } satisfies IRChild,
  ]) {
    const cell = resolveCell({ content }, {});
    expect(cell.style.fill).toBe('gray');
    expect(cell.layout.padding).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  }
});

it('集合整体、角色与单格显式配置依次覆盖嵌套默认值', () => {
  const content = nested[nested.length - 1];
  const overall = { overallStyle: { fill: 'red' }, overallLayout: { padding: 6 } };
  const role = { ...overall, roleStyle: { fill: 'blue' }, roleLayout: { padding: 4 } };
  expect(resolveCell({ content }, overall)).toMatchObject({ style: { fill: 'red' }, layout: { padding: { left: 6 } } });
  expect(resolveCell({ content }, role)).toMatchObject({ style: { fill: 'blue' }, layout: { padding: { left: 4 } } });
  expect(resolveCell({ content, style: { fill: 'green' }, layout: { padding: 2 } }, role)).toMatchObject({
    style: { fill: 'green' },
    layout: { padding: { left: 2 } },
  });
  expect(resolveCell({ content, layout: { padding: 3 } }, {}).style.fill).toBe('none');
  expect(resolveCell({ content, style: { fill: 'red' } }, {}).layout.padding.left).toBe(0);
});

it('JSON 展开与手动嵌套采用同一默认值，未展开数据仍作为普通文本', () => {
  for (const value of [[1, 2], { key: 2 }]) {
    const expanded = createDataCell(value, true);
    expect(resolveCell(expanded, {}).style.fill).toBe('none');
    expect(resolveCell(expanded, {}).layout.padding.left).toBe(0);
    const collapsed = resolveCell(createDataCell(value, false), {});
    expect(collapsed.style.fill).toBe('gray');
    expect(collapsed.layout.padding.left).toBe(8);
  }
});

it('嵌套集合的外层 Cell 保留身份，默认尺寸与子集合一致，显式 padding 扩大外层', () => {
  const compile = (content: IRChild, padding?: number) =>
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            namespace: 'standard',
            type: 'chain',
            items: [{ kind: 'cell', id: 'outer', content, ...(padding === undefined ? {} : { layout: { padding } }) }],
          },
        ],
      },
      {
        composites: [ArrayDefinition, MapDefinition, MatrixDefinition, ChainDefinition, TreeDefinition],
        clips: [PathClipDefinition],
        padding: 0,
      },
    );
  for (const content of nested) {
    const child = { ...content, id: 'inner' };
    const result = compile(child);
    const outer = result.spatialHandles.entries.find(entry => entry.id === 'cell:outer')!.geometry.bounds;
    const standalone = compileToScene(
      { type: 'scene', version: 1, children: [child] },
      {
        composites: [ArrayDefinition, MapDefinition, MatrixDefinition, ChainDefinition, TreeDefinition],
        clips: [PathClipDefinition],
        padding: 0,
      },
    );
    const inner = standalone.spatialHandles.entries.find(entry => entry.role === 'container')!.geometry.bounds;
    expect(outer.width).toBeCloseTo(inner.width);
    expect(outer.height).toBeCloseTo(inner.height);
    const padded = compile(child, 5).spatialHandles.entries.find(entry => entry.id === 'cell:outer')!.geometry.bounds;
    expect(padded.width).toBeCloseTo(outer.width + 10);
    expect(padded.height).toBeCloseTo(outer.height + 10);
  }
});
