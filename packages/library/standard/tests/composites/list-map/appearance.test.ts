import type { CompileWarning, IRChild, ScenePrimitive } from '@retikz/core';
import { CompileWarningCode, compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { ListDefinition, MapDefinition } from '../../../src';
import { PathClipDefinition } from '../../../src/clip';

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
      composites: [ListDefinition, MapDefinition],
      clips: [PathClipDefinition],
      padding: 0,
    },
  );

describe('List / Map appearance and identity', () => {
  it('clips oversized content by default in fixed cells without scaling text', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'list',
        layout: { width: 12, height: 8, padding: 0 },
        style: { font: { size: 30 } },
        items: [{ id: 'small', content: 'Unscaled long text' }],
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
    expect(result.spatialHandles.entries.find(entry => entry.role === 'list-cell')?.geometry.bounds).toEqual({
      x: 0,
      y: 0,
      width: 12,
      height: 8,
    });
  });
  it('merges overall, role, and cell styles without dimming text with fillOpacity', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'map',
        style: {
          fill: 'red',
          fillOpacity: 0.2,
          font: { family: 'monospace' },
          key: { fill: 'blue', font: { size: 16 } },
        },
        entries: [{ key: { content }, value: { content, style: { fill: 'green', fillOpacity: 0 } } }],
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
  it('publishes cell allocation when background and border are absent', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'list',
        transforms: [{ kind: 'translate', x: 10, y: 20 }],
        style: { fill: 'none', stroke: 'none' },
        layout: { width: 100, height: 60 },
        items: ['slot'],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'slot', anchor: 'right' } },
          { type: 'step', kind: 'line', to: [150, 50] },
        ],
      },
    ]);
    expect(result.spatialHandles.entries.find(entry => entry.role === 'list-cell')?.geometry.bounds).toEqual({
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
  it('does not create cell handles without authored ids, including indexed lists', () => {
    const result = compile([
      { namespace: 'standard', type: 'list', showIndex: true, indexStart: 4, items: [{ content }] },
    ]);
    expect(result.spatialHandles.entries.filter(entry => entry.role === 'list-cell')).toHaveLength(0);
    expect(flat(result.scene.primitives).filter(node => node.type === 'text')).toEqual(
      expect.arrayContaining([expect.objectContaining({ lines: [{ text: '4' }] })]),
    );
  });
  it('applies root font defaults during allocation and clips each cell separately', () => {
    const result = compile([
      {
        namespace: 'standard',
        type: 'list',
        defaults: { node: { style: { font: { size: 30 } } } },
        layout: { overflow: 'clip' },
        items: [
          { id: 'one', content },
          { id: 'two', content },
        ],
      },
    ]);
    expect(
      flat(result.scene.primitives)
        .filter(node => node.type === 'text')
        .every(node => node.fontSize === 30),
    ).toBe(true);
    expect(result.scene.resources?.some(resource => resource.kind === 'clip')).toBe(true);
    expect(result.spatialHandles.entries.find(entry => entry.role === 'list-cell')?.geometry.bounds.width).toBeCloseTo(
      82,
    );
  });
});

it('preserves Core namespace isolation, duplicate diagnostics, and delayed cell references', () => {
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
            type: 'list',
            localNamespace,
            style: { fill: 'none', stroke: 'none' },
            layout: { width: 100, height: 60 },
            items: ['slot'],
          },
        ],
      },
      {
        composites: [ListDefinition],
        clips: [PathClipDefinition],
        onWarn: warning => warnings.push(warning),
        padding: 0,
      },
    );
    expect(warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toHaveLength(
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

it('compiles persistent text cells exactly like explicit undecorated nodes without rewriting Source', () => {
  const textNode: IRChild = {
    type: 'node',
    position: [0, 0],
    text: 'A',
    style: { fill: 'none', stroke: 'none' },
    layout: { padding: 0, margin: 0 },
  };
  const source: Array<IRChild> = [
    { namespace: 'standard', type: 'list', style: { font: { size: 18 } }, items: ['A'] },
    { namespace: 'standard', type: 'map', entries: [{ key: 'A', value: { content: 'A', style: { fill: 'blue' } } }] },
  ];
  const before = JSON.stringify(source);
  const actual = compile(source);
  const explicit = compile([
    { namespace: 'standard', type: 'list', style: { font: { size: 18 } }, items: [{ id: 'A', content: textNode }] },
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
