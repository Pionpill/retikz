import type { IRChild, IRNode, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { ListDefinition, ListSchema, MapDefinition, MapSchema } from '../../../src/container';
import type { IRList, IRMap } from '../../../src/container';

const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? [node, ...flat(node.children)] : [node]));
const compile = (children: Array<IRChild>) =>
  compileToScene(
    { type: 'scene', version: 1, children },
    { composites: [ListDefinition, MapDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const labelsOf = (children: Array<IRChild>) =>
  flat(compile(children).scene.primitives).filter(
    node => node.type === 'text' && node.lines.some(line => line.text.startsWith('label')),
  );
const sources: Array<IRList | IRMap> = [
  {
    namespace: 'standard',
    type: 'list',
    items: [{ id: 'cell', content: 'a' }],
    layout: { width: 80, height: 40, gap: 0 },
  },
  {
    namespace: 'standard',
    type: 'map',
    entries: [{ key: { id: 'cell', content: 'a' }, value: 'b' }],
    layout: { width: 40, height: 40, gap: 0 },
  },
];
const host = (label: IRNode['label']): IRNode => ({
  type: 'node',
  position: [40, 20],
  shape: 'rectangle',
  label,
  style: { fill: 'none', stroke: 'none', strokeWidth: 0 },
  layout: { minimumSize: { width: 80, height: 40 }, padding: 0, margin: 0 },
});

describe('List / Map container labels', () => {
  it('preserves Node label Source and its cross-field validation', () => {
    const label = [{ text: 'label top' }, { text: 'label pin', position: 'bottom', pin: true }];
    for (const source of sources) {
      const parse =
        source.type === 'list'
          ? (input: unknown) => ListSchema.parse(input).label
          : (input: unknown) => MapSchema.parse(input).label;
      const accepts =
        source.type === 'list'
          ? (input: unknown) => ListSchema.safeParse(input).success
          : (input: unknown) => MapSchema.safeParse(input).success;
      expect(parse(JSON.parse(JSON.stringify({ ...source, label })))).toEqual(label);
      expect(accepts({ ...source, label: { text: 'label', placement: 'inside', pin: true } })).toBe(false);
    }
  });
  it('uses the same default and explicit label rendering as a Node of the allocated size', () => {
    for (const label of [
      { text: 'label default' },
      [
        { text: 'label rotated', position: 'left', rotate: 25, distance: 12, font: { size: 19 }, textColor: 'red' },
        { text: 'label pin', position: 'bottom', pin: true },
      ],
    ] satisfies Array<IRNode['label']>) {
      for (const source of sources) expect(labelsOf([{ ...source, label }])).toEqual(labelsOf([host(label)]));
    }
  });
  it('keeps container and cell handles and named path endpoints stable while expanding the viewBox', () => {
    for (const source of sources) {
      const path: IRChild = {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'container', anchor: 'right' } },
          { type: 'step', kind: 'line', to: [120, 20] },
        ],
      };
      const before = compile([{ ...source, id: 'container' }, path]);
      const after = compile([
        { ...source, id: 'container', label: { text: 'label with a very long title', distance: 20 } },
        path,
      ]);
      expect(after.spatialHandles.entries.map(entry => ({ role: entry.role, geometry: entry.geometry }))).toEqual(
        before.spatialHandles.entries.map(entry => ({ role: entry.role, geometry: entry.geometry })),
      );
      expect(
        flat(after.scene.primitives)
          .filter(node => node.type === 'path')
          .at(-1),
      ).toEqual(
        flat(before.scene.primitives)
          .filter(node => node.type === 'path')
          .at(-1),
      );
      expect(after.scene.layout).not.toEqual(before.scene.layout);
    }
  });
  it('inherits label defaults and container text style without inheriting cell role styles', () => {
    const defaults = { label: { font: { size: 21 }, textColor: 'green' } };
    const label = { text: 'label inherited' };
    const expected = labelsOf([{ type: 'scope', defaults, children: [host(label)] }]);
    for (const source of sources) expect(labelsOf([{ ...source, label, defaults }])).toEqual(expected);
    for (const source of sources)
      expect(labelsOf([{ ...source, label, style: { font: { size: 18 }, textColor: 'blue' } }])).toEqual(
        labelsOf([
          {
            ...host(label),
            style: { fill: 'none', stroke: 'none', strokeWidth: 0, font: { size: 18 }, textColor: 'blue' },
          },
        ]),
      );
  });
  it('renders empty container labels and applies root transforms and clipping outside cell clips', () => {
    for (const source of [
      { namespace: 'standard', type: 'list', data: [] },
      { namespace: 'standard', type: 'map', data: {} },
    ]) {
      const result = compile([
        { ...source, label: { text: 'label empty' }, transforms: [{ kind: 'translate', x: 10, y: 20 }] },
      ]);
      expect(flat(result.scene.primitives).filter(node => node.type === 'text')).toHaveLength(1);
      expect(result.spatialHandles.entries.find(entry => entry.role === 'container')?.geometry.bounds).toEqual({
        x: 10,
        y: 20,
        width: 0,
        height: 0,
      });
    }
    for (const source of sources) {
      const result = compile([
        {
          ...source,
          label: { text: 'label outside' },
          transforms: [{ kind: 'translate', x: 10, y: 20 }],
          clip: { kind: 'rect', x: 0, y: -30, width: 100, height: 80 },
        },
      ]);
      const root = result.scene.primitives[0];
      expect(root).toMatchObject({ type: 'group', transforms: [{ kind: 'translate', x: 10, y: 20 }] });
      if (root.type !== 'group') throw new Error('Expected clipped container');
      expect(root.clipRef).toBeDefined();
      expect(
        flat(root.children).some(
          node => node.type === 'text' && node.lines.some(line => line.text === 'label outside'),
        ),
      ).toBe(true);
    }
  });
});
