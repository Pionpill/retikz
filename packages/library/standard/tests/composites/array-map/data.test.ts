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

describe('JSON 数据呈现', () => {
  it('将非空对象显示为紧凑的 JSON 文本，而不将它们扩展到地图中', () => {
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

  it('保留 Map 数据根及其键，同时将嵌套对象显示为文本', () => {
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
  ])('选择 $dataExpand 的嵌套组件并在文本子树处停止', ({ dataExpand, texts }) => {
    for (const width of ['auto', 'content']) {
      const source = {
        namespace: 'standard',
        type: 'array',
        id: 'values',
        cellIdMode: 'index',
        data: [{ a: [1] }, [2, { b: 3 }]],
        dataExpand,
        defaultCell: { layout: { width } },
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

  it('将组件选择视为一组，并将空结构保留为文本', () => {
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

  it('通过解析保留紧凑的 JSON Source 并拒绝混合或缺失的输入', () => {
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

  it('渲染 JSON 文字、重复字符串和没有单元格标识的嵌套空容器', () => {
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

  it('匹配显式嵌套结构，包括枚举顺序和仅限本地布局覆盖', () => {
    const options = {
      layout: { gap: 7 },
      defaultCell: {
        style: { font: { size: 17 } },
        key: { style: { fill: 'blue' } },
        value: { layout: { width: 40, height: 20 } },
      },
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

  it('通过数据生成的嵌套数组传递内容宽度', () => {
    const actual = compile({
      namespace: 'standard',
      type: 'array',
      data: [['A', 'longer']],
      defaultCell: { layout: { width: 'content' } },
    });
    const expected = compile({
      namespace: 'standard',
      type: 'array',
      items: [
        {
          content: {
            namespace: 'standard',
            type: 'array',
            data: ['A', 'longer'],
            defaultCell: { layout: { width: 'content' } },
          },
        },
      ],
      defaultCell: { layout: { width: 'content' } },
    });

    expect(actual.scene.primitives).toEqual(expected.scene.primitives);
  });

  it('通过数据生成的映射将内容宽度传递到更深的数组', () => {
    const actual = compile({
      namespace: 'standard',
      type: 'array',
      data: [{ values: ['A', 'longer'] }],
      defaultCell: { layout: { width: 'content' } },
    });
    const expected = compile({
      namespace: 'standard',
      type: 'array',
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
                    data: ['A', 'longer'],
                    defaultCell: { layout: { width: 'content' } },
                  },
                },
              },
            ],
          },
        },
      ],
      defaultCell: { layout: { width: 'content' } },
    });

    expect(actual.scene.primitives).toEqual(expected.scene.primitives);
  });

  it('通过多个数据生成的 Array 级别传递内容宽度', () => {
    const actual = compile({
      namespace: 'standard',
      type: 'array',
      data: [[['A', 'longer']]],
      defaultCell: { layout: { width: 'content' } },
    });
    const expected = compile({
      namespace: 'standard',
      type: 'array',
      items: [
        {
          content: {
            namespace: 'standard',
            type: 'array',
            items: [
              {
                content: {
                  namespace: 'standard',
                  type: 'array',
                  data: ['A', 'longer'],
                  defaultCell: { layout: { width: 'content' } },
                },
              },
            ],
            defaultCell: { layout: { width: 'content' } },
          },
        },
      ],
      defaultCell: { layout: { width: 'content' } },
    });

    expect(actual.scene.primitives).toEqual(expected.scene.primitives);
  });

  it('不将内容宽度传递给手工编写的子级或固定宽度的数据数组', () => {
    const nested = { namespace: 'standard', type: 'array', data: ['A', 'longer'] };
    const authored = compile({
      namespace: 'standard',
      type: 'array',
      items: [{ content: nested }],
      defaultCell: { layout: { width: 'content' } },
    });
    const authoredWithAuto = compile({
      namespace: 'standard',
      type: 'array',
      items: [{ content: { ...nested, defaultCell: { layout: { width: 'auto' } } } }],
      defaultCell: { layout: { width: 'content' } },
    });

    expect(authored.scene.primitives).toEqual(authoredWithAuto.scene.primitives);

    const fixed = compile({
      namespace: 'standard',
      type: 'array',
      data: [['A', 'longer']],
      defaultCell: { layout: { width: 180 } },
    });
    const fixedWithAuto = compile({
      namespace: 'standard',
      type: 'array',
      items: [{ content: { ...nested, defaultCell: { layout: { width: 'auto' } } } }],
      defaultCell: { layout: { width: 180 } },
    });

    expect(fixed.scene.primitives).toEqual(fixedWithAuto.scene.primitives);
  });

  it('保持根空容器等同于空显式结构', () => {
    expect(compile({ namespace: 'standard', type: 'map', data: {} }).scene).toEqual(
      compile({ namespace: 'standard', type: 'map', entries: [] }).scene,
    );
    expect(compile({ namespace: 'standard', type: 'array', data: [] }).scene).toEqual(
      compile({ namespace: 'standard', type: 'array', items: [] }).scene,
    );
  });
});
