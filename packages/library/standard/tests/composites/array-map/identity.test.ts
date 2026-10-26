import type { IRChild } from '@retikz/core';
import { compileToScene, resolveSpatialHandle, selectSpatialHandles } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { getArrayCellId, ArrayDefinition, ArraySchema, MapDefinition } from '../../../src/collection';
import { RetikzStandardError } from '../../../src/shared/errors';

const base = { namespace: 'standard', type: 'array', id: 'array', cellIdMode: 'index' };

const compile = (children: Array<IRChild>) =>
  compileToScene(
    { type: 'scene', version: 1, children },
    { composites: [ArrayDefinition, MapDefinition], clips: [PathClipDefinition] },
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
    expect(positioned.spatialHandles).toEqual(translated.spatialHandles);
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

  it('发布生成的显式 ID 的一条记录，并删除重复的名称', () => {
    const result = compile([
      {
        ...base,
        items: [
          { id: 'named', content: 'a' },
          { id: 'array-1', content: 'b' },
        ],
      },
    ]);
    const handles = selectSpatialHandles(result.spatialHandles, { role: 'array-cell' });

    expect(handles).toHaveLength(2);
    expect(handles[0]).toMatchObject({ id: 'cell:array-0', aliasIds: ['cell:named'] });
    expect(handles[1]).not.toHaveProperty('aliasIds');
    expect(resolveSpatialHandle(result.spatialHandles, { id: 'cell:named' })).toBe(handles[0]);
    expect(resolveSpatialHandle(result.spatialHandles, { id: 'cell:array-0' })).toBe(handles[0]);
    expect(Object.isFrozen(handles[0]?.aliasIds)).toBe(true);
  });

  it('仅将 id 分配给直接数据单元格，与显示的编号无关', () => {
    const result = compile([{ ...base, data: ['a', ['b', 'c'], { nested: [1, 2] }], index: { start: 100 } }]);
    const handles = selectSpatialHandles(result.spatialHandles, { role: 'array-cell' });

    expect(handles.map(handle => handle.id)).toEqual(['cell:array-0', 'cell:array-1', 'cell:array-2']);
    expect(
      selectSpatialHandles(compile([{ ...base, data: [], index: true }]).spatialHandles, { role: 'array-cell' }),
    ).toEqual([]);
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
    expect(withAlias.spatialHandles.entries.map(entry => entry.geometry)).toEqual(
      withoutAlias.spatialHandles.entries.map(entry => entry.geometry),
    );
  });
});
