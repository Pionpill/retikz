import type { IRChild } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { pathClipDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { arrayDefinition, ArraySchema, getArrayCellId, mapDefinition } from '../../../src/collection';
import { RetikzStandardError } from '../../../src/shared/errors';
import { sceneCellBounds, sceneNodes } from '../../helpers/scene-geometry';

const base = { namespace: 'standard', type: 'array', id: 'array', cellIdMode: 'index' };

const compile = (children: Array<IRChild>) =>
  compileToScene(
    { type: 'scene', version: 1, children },
    { composites: [arrayDefinition, mapDefinition], clips: [pathClipDefinition] },
  );

const path = (id: string): IRChild => ({
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: { id, anchor: 'right' } },
  ],
});

describe('Array 直接小区标识', () => {
  it('Map 位置发布与外部平移相同的几何图形和参考', () => {
    const map = { namespace: 'standard', type: 'map', id: 'map', entries: [{ key: 'key', value: 'value' }] };
    const positioned = compile([{ ...map, position: [100, 50], transforms: [{ kind: 'scale', x: 2 }] }, path('map')]);
    const translated = compile([
      {
        ...map,
        transforms: [
          { kind: 'translate', x: 100, y: 50 },
          { kind: 'scale', x: 2 },
        ],
      },
      path('map'),
    ]);
    expect(positioned.scene).toEqual(translated.scene);
  });

  it('格式化从零开始的 id 并拒绝无效的辅助参数', () => {
    expect(getArrayCellId('array', 1)).toBe('array-1');

    for (const index of [-1, 0.5, Infinity, NaN])
      expect(() => getArrayCellId('array', index)).toThrow(RetikzStandardError);
  });

  it('验证缺失的父身份、数据模式和跨单元冲突', () => {
    for (const input of [
      { namespace: 'standard', type: 'array', items: [], cellIdMode: 'index' },
      { ...base, data: ['a'], cellIdMode: 'string' },
      { ...base, items: [{ id: 'array-1', content: 'a' }, 'b'] },
      { ...base, items: ['a', { id: 'array-0', content: 'b' }] },
    ])
      expect(ArraySchema.safeParse(input).success).toBe(false);

    const source = { ...base, items: [{ id: 'array-0', content: 'a' }] };

    expect(ArraySchema.parse(JSON.parse(JSON.stringify(source))).items).toEqual(source.items);
  });

  it('显式别名与生成 id 引用同一格，不重复绘图', () => {
    const child = {
      ...base,
      items: [
        { id: 'named', content: 'a' },
        { id: 'array-1', content: 'b' },
      ],
    };
    expect(compile([child, path('named')]).scene).toEqual(compile([child, path('array-0')]).scene);
    expect(sceneNodes(compile([child]).scene).filter(node => node.id === 'array-0')).toHaveLength(1);
  });

  it('仅将 id 分配给直接数据单元格，与显示的编号无关', () => {
    const result = compile([{ ...base, data: ['a', ['b', 'c'], { nested: [1, 2] }], index: { start: 100 } }]);
    const ids = sceneNodes(result.scene).flatMap(node => (node.id?.startsWith('array-') ? [node.id] : []));

    expect(ids).toEqual(['array-0', 'array-1', 'array-2']);
    expect(sceneCellBounds(compile([{ ...base, data: [], index: true }]).scene)).toEqual([]);
  });

  it('通过转换后的布局回放来解析两个 id，而无需重复的几何图形', () => {
    const nested: IRChild = {
      ...base,
      items: [{ id: 'named', content: 'a' }],
      transforms: [{ kind: 'translate', x: 7, y: 11 }],
    };
    const parent: IRChild = {
      namespace: 'standard',
      type: 'array',
      items: [{ content: nested }],
      transforms: [{ kind: 'translate', x: 50, y: 70 }],
      defaultCell: { layout: { width: 120, height: 80 } },
    };

    expect(compile([parent, path('named')])).toEqual(compile([parent, path('array-0')]));

    const parentWithoutAlias: IRChild = { ...parent, items: [{ content: { ...nested, items: ['a'] } }] };

    expect(compile([parent, path('array-0')]).scene).toEqual(compile([parentWithoutAlias, path('array-0')]).scene);

    const withAlias = compile([nested]);
    const withoutAlias = compile([{ ...base, items: ['a'], transforms: [{ kind: 'translate', x: 7, y: 11 }] }]);

    expect(withAlias.scene).toEqual(withoutAlias.scene);
    expect(withAlias.artifacts).toEqual(withoutAlias.artifacts);
  });
});
