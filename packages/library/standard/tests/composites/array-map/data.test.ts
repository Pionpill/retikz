import type { IRChild, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { ArrayDefinition, ArraySchema, MapDefinition, MapSchema } from '../../../src/collection';

const compile = (child: IRChild) =>
  compileToScene(
    { type: 'scene', version: 1, children: [child] },
    { composites: [ArrayDefinition, MapDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? [node, ...flat(node.children)] : [node]));

describe('JSON data presentation', () => {
  it('shows nonempty objects as compact JSON text without expanding them into Maps', () => {
    const source = {
      namespace: 'standard',
      type: 'array',
      data: [{ a: 1, nested: { b: true } }, [{ c: 'x' }], {}],
      dataExpand: ['array'],
    };
    const before = JSON.stringify(source);
    const result = compile(source);
    expect(
      flat(result.scene.primitives)
        .filter(node => node.type === 'text')
        .flatMap(node => node.lines.map(line => line.text)),
    ).toEqual(['{"a":1,"nested":{"b":true}}', '{"c":"x"}', '{}']);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('keeps a Map data root and its keys while showing nested objects as text', () => {
    const result = compile({
      namespace: 'standard',
      type: 'map',
      data: { record: { a: 1 }, values: [{ b: 2 }] },
      dataExpand: ['array'],
    });
    expect(
      flat(result.scene.primitives)
        .filter(node => node.type === 'text')
        .flatMap(node => node.lines.map(line => line.text)),
    ).toEqual(['record', '{"a":1}', 'values', '{"b":2}']);
  });
  it.each([
    { dataExpand: true, texts: ['a', '1', '2', 'b', '3'] },
    { dataExpand: false, texts: ['{"a":[1]}', '[2,{"b":3}]'] },
    { dataExpand: [], texts: ['{"a":[1]}', '[2,{"b":3}]'] },
    { dataExpand: ['map'], texts: ['a', '[1]', '[2,{"b":3}]'] },
    { dataExpand: ['array'], texts: ['{"a":[1]}', '2', '{"b":3}'] },
    { dataExpand: ['map', 'array'], texts: ['a', '1', '2', 'b', '3'] },
  ])('selects nested components for $dataExpand and stops at text subtrees', ({ dataExpand, texts }) => {
    for (const width of ['auto', 'content']) {
      const source = {
        namespace: 'standard',
        type: 'array',
        id: 'values',
        cellIdMode: 'index',
        data: [{ a: [1] }, [2, { b: 3 }]],
        dataExpand,
        layout: { width },
      };
      const before = JSON.stringify(source);
      const result = compile(source);
      expect(
        flat(result.scene.primitives)
          .filter(node => node.type === 'text')
          .flatMap(node => node.lines.map(line => line.text)),
      ).toEqual(texts);
      expect(result.spatialHandles.entries.filter(entry => entry.role === 'array-cell').map(entry => entry.id)).toEqual(
        ['cell:values-0', 'cell:values-1'],
      );
      expect(JSON.stringify(source)).toBe(before);
    }
    const result = compile({
      namespace: 'standard',
      type: 'map',
      data: { first: { a: [1] }, second: [2, { b: 3 }] },
      dataExpand,
    });
    const rendered = flat(result.scene.primitives)
      .filter(node => node.type === 'text')
      .flatMap(node => node.lines.map(line => line.text));
    expect(rendered.filter(text => text !== 'first' && text !== 'second')).toEqual(texts);
    expect(rendered.filter(text => text === 'first' || text === 'second')).toEqual(['first', 'second']);
  });

  it('treats component choices as a set and leaves empty structures as text', () => {
    const source = { namespace: 'standard', type: 'array', data: [{ a: [1] }, [2], {}, []] };
    const expected = compile(source).scene;
    for (const dataExpand of [true, ['map', 'array'], ['array', 'map', 'array']]) {
      expect(compile({ ...source, dataExpand }).scene).toEqual(expected);
    }
    for (const dataExpand of [true, false, [], ['map'], ['array']]) {
      const result = compile({ ...source, data: [{}, [], '', null, false, 0], dataExpand });
      expect(
        flat(result.scene.primitives)
          .filter(node => node.type === 'text')
          .flatMap(node => node.lines.map(line => line.text)),
      ).toEqual(['{}', '[]', '""', 'null', 'false', '0']);
    }
  });

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
    expect(ArraySchema.parse({ namespace: 'standard', type: 'array', data: ['', '', null] }).data).toEqual([
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
      expect(ArraySchema.safeParse({ namespace: 'standard', type: 'array', ...fields }).success).toBe(false);
    const sparse: Array<unknown> = [];
    sparse.length = 2;
    for (const value of [undefined, Infinity, NaN, () => 1, new Date(), new Map(), new Set(), sparse])
      expect(ArraySchema.safeParse({ namespace: 'standard', type: 'array', data: [value] }).success).toBe(false);
  });

  it('renders JSON literals, repeated strings and nested empty containers without cell identities', () => {
    const data = ['', 'null', null, false, 0, 'a\n"b', {}, [], 'same', 'same'];
    const source = { namespace: 'standard', type: 'array', data };
    const before = JSON.stringify(source);
    const result = compile(source);
    expect(
      flat(result.scene.primitives)
        .filter(node => node.type === 'text')
        .flatMap(node => node.lines.map(line => line.text)),
    ).toEqual(['""', '"null"', 'null', 'false', '0', '"a\\n\\"b"', '{}', '[]', '"same"', '"same"']);
    expect(
      result.spatialHandles.entries.filter(entry => ['array-cell', 'map-key', 'map-value'].includes(entry.role)),
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
        { key: '1', value: 'null' },
        { key: '2', value: 'false' },
        {
          key: 'z',
          value: {
            content: {
              namespace: 'standard',
              type: 'array',
              items: [
                { content: '1' },
                { content: { namespace: 'standard', type: 'map', entries: [{ key: 'id', value: '"a"' }] } },
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

  it('passes content width through data-generated nested Arrays', () => {
    const actual = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      data: [['A', 'longer']],
    });
    const expected = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      items: [
        { content: { namespace: 'standard', type: 'array', layout: { width: 'content' }, data: ['A', 'longer'] } },
      ],
    });
    expect(actual.scene.primitives).toEqual(expected.scene.primitives);
  });

  it('passes content width through data-generated Maps to deeper Arrays', () => {
    const actual = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      data: [{ values: ['A', 'longer'] }],
    });
    const expected = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      items: [
        {
          content: {
            namespace: 'standard',
            type: 'map',
            entries: [
              {
                key: 'values',
                value: {
                  content: {
                    namespace: 'standard',
                    type: 'array',
                    layout: { width: 'content' },
                    data: ['A', 'longer'],
                  },
                },
              },
            ],
          },
        },
      ],
    });
    expect(actual.scene.primitives).toEqual(expected.scene.primitives);
  });

  it('passes content width through multiple data-generated Array levels', () => {
    const actual = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      data: [[['A', 'longer']]],
    });
    const expected = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      items: [
        {
          content: {
            namespace: 'standard',
            type: 'array',
            layout: { width: 'content' },
            items: [
              {
                content: {
                  namespace: 'standard',
                  type: 'array',
                  layout: { width: 'content' },
                  data: ['A', 'longer'],
                },
              },
            ],
          },
        },
      ],
    });
    expect(actual.scene.primitives).toEqual(expected.scene.primitives);
  });

  it('does not pass content width to hand-authored children or from fixed-width data Arrays', () => {
    const nested = { namespace: 'standard', type: 'array', data: ['A', 'longer'] };
    const authored = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      items: [{ content: nested }],
    });
    const authoredWithAuto = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 'content' },
      items: [{ content: { ...nested, layout: { width: 'auto' } } }],
    });
    expect(authored.scene.primitives).toEqual(authoredWithAuto.scene.primitives);

    const fixed = compile({ namespace: 'standard', type: 'array', layout: { width: 180 }, data: [['A', 'longer']] });
    const fixedWithAuto = compile({
      namespace: 'standard',
      type: 'array',
      layout: { width: 180 },
      items: [{ content: { ...nested, layout: { width: 'auto' } } }],
    });
    expect(fixed.scene.primitives).toEqual(fixedWithAuto.scene.primitives);
  });

  it('keeps root empty containers equivalent to empty explicit structures', () => {
    expect(compile({ namespace: 'standard', type: 'map', data: {} }).scene).toEqual(
      compile({ namespace: 'standard', type: 'map', entries: [] }).scene,
    );
    expect(compile({ namespace: 'standard', type: 'array', data: [] }).scene).toEqual(
      compile({ namespace: 'standard', type: 'array', items: [] }).scene,
    );
  });
});
