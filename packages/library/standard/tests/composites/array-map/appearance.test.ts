import type { CompileWarning, IRChild, ScenePrimitive } from '@retikz/core';
import { BuiltinCompileWarningCode, compileToScene } from '@retikz/core';
import { pathClipDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { arrayDefinition, mapDefinition } from '../../../src/collection';

const content: IRChild = {
  type: 'node',
  position: [-8, 3],
  text: 'item',
  style: { fill: 'none', stroke: 'none' },
  layout: { padding: 0, margin: 0 },
};

const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? [node, ...flat(node.children)] : [node]));

const compile = (children: Array<IRChild>) =>
  compileToScene(
    { type: 'scene', version: 1, children },
    {
      composites: [arrayDefinition, mapDefinition],
      clips: [pathClipDefinition],
      padding: 0,
    },
  );

describe('Array / Map 外观和身份', () => {
  it('在回放之前根据单元主颜色解析数字内容绘制', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'array',
        items: [{ content: { ...content, style: { fill: 0.2, stroke: 'none' } } }],
        defaultCell: { style: { color: '#336699' } },
      },
    ]);

    expect(flat(result.scene.primitives).filter(node => node.type === 'rect')).toEqual(
      expect.arrayContaining([expect.objectContaining({ fill: '#d6e0eb' })]),
    );
  });

  it('覆盖索引文本样式而不更改单元格文本并合并字体字段', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'array',
        items: ['A'],
        index: {
          start: 7,
          position: 'after',
          style: { font: { size: 28, weight: 'bold' }, textColor: 'red', opacity: 0.5 },
        },
        defaultCell: { style: { font: { family: 'monospace', size: 14 }, textColor: 'blue' } },
      },
    ]);
    const texts = flat(result.scene.primitives).filter(node => node.type === 'text');

    expect(texts.find(node => node.lines[0]?.text === '7')).toMatchObject({
      fontFamily: 'monospace',
      fontSize: 28,
      fill: 'red',
      opacity: 0.5,
    });
    expect(texts.find(node => node.lines[0]?.text === 'A')).toMatchObject({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 'blue',
    });
  });

  it('默认在固定单元格中裁剪超大内容，而不缩放文本', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'array',
        items: [{ id: 'small', content: 'Unscaled long text' }],
        defaultCell: { style: { font: { size: 30 } }, layout: { width: 12, height: 8, padding: 0 } },
      },
    ]);
    const primitives = flat(result.scene.primitives);

    expect(primitives.filter(node => node.type === 'text')).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 30, lines: [{ text: 'Unscaled long text' }] })]),
    );

    const clipped = primitives.find(node => node.type === 'group' && node.clipRef !== undefined);

    expect(clipped?.type === 'group' ? clipped.clipRef : undefined).toBeDefined();
    expect(
      result.scene.resources
        ?.filter(resource => resource.kind === 'clip')
        .some(resource =>
          resource.path.commands.some(
            command => command.kind === 'line' && command.to[0] === 12 && command.to[1] === 8,
          ),
        ),
    ).toBe(true);
    expect(result.spatialHandles.entries.find(entry => entry.role === 'array-cell')?.geometry.bounds).toEqual({
      x: 0,
      y: 0,
      width: 12,
      height: 8,
    });
  });

  it('使用 fillOpacity 合并整体、角色和单元格样式，而不使文本变暗', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'map',
        entries: [{ key: { content }, value: { content, style: { fill: 'green', opacity: { fill: 0 } } } }],
        defaultCell: {
          style: { fill: 'red', font: { family: 'monospace' }, opacity: { fill: 0.2 } },
          key: { style: { fill: 'blue', font: { size: 16 } } },
        },
      },
    ]);
    const primitives = flat(result.scene.primitives);

    expect(primitives.filter(node => node.type === 'path' && node.fill !== 'none')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: 'blue', fillOpacity: 0.2 }),
        expect.objectContaining({ fill: 'green', fillOpacity: 0 }),
      ]),
    );

    const texts = primitives.filter(node => node.type === 'text');

    expect(texts).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'monospace', fontSize: 16 })]));
    expect(texts.every(node => node.opacity === undefined || node.opacity === 1)).toBe(true);
  });

  it('当背景和边框不存在时发布单元格分配', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'array',
        transforms: [{ kind: 'translate', x: 10, y: 20 }],
        cellIdMode: 'string',
        items: ['slot'],
        defaultCell: { style: { fill: 'none', stroke: 'none' }, layout: { width: 100, height: 60 } },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'slot', anchor: 'right' } },
          { type: 'step', kind: 'line', to: [150, 50] },
        ],
      },
    ]);

    expect(result.spatialHandles.entries.find(entry => entry.role === 'array-cell')?.geometry.bounds).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    });
    expect(
      flat(result.scene.primitives)
        .filter(node => node.type === 'path')
        .at(-1)?.commands[0],
    ).toMatchObject({ kind: 'move', to: [110, 50] });
  });

  it('如果没有编写的 ID，则不会创建单元格句柄，包括索引列表', () => {
    const result = compile([{ namespace: 'standard', type: 'array', index: { start: 4 }, items: [{ content }] }]);

    expect(result.spatialHandles.entries.filter(entry => entry.role === 'array-cell')).toHaveLength(0);
    expect(flat(result.scene.primitives).filter(node => node.type === 'text')).toEqual(
      expect.arrayContaining([expect.objectContaining({ lines: [{ text: '4' }] })]),
    );
  });

  it('在分配期间应用根字体默认值并单独裁剪每个单元格', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'array',
        defaults: { node: { style: { font: { size: 30 } } } },
        items: [
          { id: 'one', content },
          { id: 'two', content },
        ],
        defaultCell: { layout: { overflow: 'clip' } },
      },
    ]);

    expect(
      flat(result.scene.primitives)
        .filter(node => node.type === 'text')
        .every(node => node.fontSize === 30),
    ).toBe(true);
    expect(result.scene.resources?.some(resource => resource.kind === 'clip')).toBe(true);
    expect(result.spatialHandles.entries.find(entry => entry.role === 'array-cell')?.geometry.bounds.width).toBeCloseTo(
      82,
    );
  });
});

it('保留 Core 命名空间隔离、重复诊断和延迟单元引用', () => {
  for (const localNamespace of [true, false]) {
    const warnings: Array<CompileWarning> = [];
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          { type: 'node', id: 'slot', position: [300, 300], style: { fill: 'none', stroke: 'none' } },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'slot', anchor: 'center' } },
              { type: 'step', kind: 'line', to: [400, 400] },
            ],
          },
          {
            namespace: 'standard',
            type: 'array',
            localNamespace,
            cellIdMode: 'string',
            items: ['slot'],
            defaultCell: { style: { fill: 'none', stroke: 'none' }, layout: { width: 100, height: 60 } },
          },
        ],
      },
      {
        composites: [arrayDefinition],
        clips: [pathClipDefinition],
        onWarn: warning => warnings.push(warning),
        padding: 0,
      },
    );

    expect(warnings.filter(warning => warning.code === BuiltinCompileWarningCode.DuplicateNodeId)).toHaveLength(
      localNamespace ? 0 : 1,
    );

    const line = flat(result.scene.primitives).find(
      node => node.type === 'path' && node.commands.some(command => command.kind === 'line' && command.to[0] === 400),
    );

    expect(line?.type === 'path' ? line.commands[0] : undefined).toMatchObject({
      kind: 'move',
      to: localNamespace ? [300, 300] : [50, 30],
    });
  }
});

it('完全像显式未修饰节点一样编译持久文本单元，而无需重写 Source', () => {
  const textNode: IRChild = {
    type: 'node',
    position: [0, 0],
    text: 'A',
    style: { fill: 'none', stroke: 'none' },
    layout: { padding: 0, margin: 0 },
  };
  const source: Array<IRChild> = [
    { namespace: 'standard', type: 'array', items: ['A'], defaultCell: { style: { font: { size: 18 } } } },
    { namespace: 'standard', type: 'map', entries: [{ key: 'A', value: { content: 'A', style: { fill: 'blue' } } }] },
  ];
  const before = JSON.stringify(source);
  const actual = compile(source);
  const explicit = compile([
    {
      namespace: 'standard',
      type: 'array',
      items: [{ content: textNode }],
      defaultCell: { style: { font: { size: 18 } } },
    },
    {
      namespace: 'standard',
      type: 'map',
      entries: [{ key: { content: textNode }, value: { content: textNode, style: { fill: 'blue' } } }],
    },
  ]);

  expect(actual.scene.primitives).toEqual(explicit.scene.primitives);
  expect(actual.spatialHandles).toEqual(explicit.spatialHandles);
  expect(JSON.stringify(source)).toBe(before);
});
