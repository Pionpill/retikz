import type { IRChild, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { ListDefinition, ListSchema, MapDefinition, MapSchema } from '../../../src';
import { PathClipDefinition } from '../../../src/clip';

const compile = (child: IRChild) =>
  compileToScene(
    { type: 'scene', version: 1, children: [child] },
    { composites: [ListDefinition, MapDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? [node, ...flat(node.children)] : [node]));

describe('JSON data presentation', () => {
  it('preserves compact JSON Source through parsing and rejects mixed or missing inputs', () => {
    const data = {
      id: 'a',
      style: { fill: 'red' },
      content: false,
      type: 'node',
      namespace: 'standard',
      values: ['', '', 0, null],
    };
    const parsed = MapSchema.parse(JSON.parse(JSON.stringify({ namespace: 'standard', type: 'map', data })));
    expect(parsed.data).toEqual(data);
    expect(parsed).not.toHaveProperty('entries');
    expect(ListSchema.parse({ namespace: 'standard', type: 'list', data: ['', '', null] }).data).toEqual([
      '',
      '',
      null,
    ]);
    for (const fields of [
      {},
      { data: {}, entries: [] },
      { data: [], entries: [] },
      { data: null },
      { data: [] },
      { data: 0 },
    ])
      expect(MapSchema.safeParse({ namespace: 'standard', type: 'map', ...fields }).success).toBe(false);
    for (const fields of [{}, { data: [], items: [] }, { data: {} }, { data: null }, { data: '' }])
      expect(ListSchema.safeParse({ namespace: 'standard', type: 'list', ...fields }).success).toBe(false);
    const sparse: Array<unknown> = [];
    sparse.length = 2;
    for (const value of [undefined, Infinity, NaN, () => 1, new Date(), new Map(), new Set(), sparse])
      expect(ListSchema.safeParse({ namespace: 'standard', type: 'list', data: [value] }).success).toBe(false);
  });

  it('renders JSON literals, repeated strings and nested empty containers without cell identities', () => {
    const data = ['', 'null', null, false, 0, 'a\n"b', {}, [], 'same', 'same'];
    const source = { namespace: 'standard', type: 'list', data };
    const before = JSON.stringify(source);
    const result = compile(source);
    expect(
      flat(result.scene.primitives)
        .filter(node => node.type === 'text')
        .flatMap(node => node.lines.map(line => line.text)),
    ).toEqual(['""', '"null"', 'null', 'false', '0', '"a\\n\\"b"', '{}', '[]', '"same"', '"same"']);
    expect(
      result.spatialHandles.entries.filter(entry => ['list-cell', 'map-key', 'map-value'].includes(entry.role)),
    ).toEqual([]);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('matches explicit nested structures including enumeration order and local-only layout overrides', () => {
    const options = {
      layout: { gap: 7, value: { width: 40, height: 20 } },
      style: { key: { fill: 'blue' }, font: { size: 17 } },
    };
    const data = { z: [1, { id: 'a' }], '2': false, '1': null };
    const actual = compile({ namespace: 'standard', type: 'map', ...options, data });
    const expected = compile({
      namespace: 'standard',
      type: 'map',
      ...options,
      entries: [
        { key: '"1"', value: 'null' },
        { key: '"2"', value: 'false' },
        {
          key: '"z"',
          value: {
            content: {
              namespace: 'standard',
              type: 'list',
              items: [
                { content: '1' },
                { content: { namespace: 'standard', type: 'map', entries: [{ key: '"id"', value: '"a"' }] } },
              ],
            },
          },
        },
      ],
    });
    expect(actual.scene.primitives).toEqual(expected.scene.primitives);
    expect(actual.scene.resources).toEqual(expected.scene.resources);
    expect(actual.scene.resources?.some(resource => resource.kind === 'clip')).toBe(true);
  });

  it('keeps root empty containers equivalent to empty explicit structures', () => {
    expect(compile({ namespace: 'standard', type: 'map', data: {} }).scene).toEqual(
      compile({ namespace: 'standard', type: 'map', entries: [] }).scene,
    );
    expect(compile({ namespace: 'standard', type: 'list', data: [] }).scene).toEqual(
      compile({ namespace: 'standard', type: 'list', items: [] }).scene,
    );
  });
});
