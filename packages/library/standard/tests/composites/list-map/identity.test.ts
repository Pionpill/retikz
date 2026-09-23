import type { IRChild } from '@retikz/core';
import { compileToScene, resolveSpatialHandle, selectSpatialHandles } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { getListCellId, ListDefinition, ListSchema, MapDefinition } from '../../../src/container';
import { RetikzStandardError } from '../../../src/shared/errors';

const base = { namespace: 'standard', type: 'list', id: 'list', cellIdMode: 'index' };
const compile = (children: Array<IRChild>) =>
  compileToScene(
    { type: 'scene', version: 1, children },
    { composites: [ListDefinition, MapDefinition], clips: [PathClipDefinition] },
  );
const path = (id: string): IRChild => ({
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: { id, anchor: 'right' } },
  ],
});

describe('List direct cell identities', () => {
  it('formats zero-based ids and rejects invalid helper arguments', () => {
    expect(getListCellId('list', 1)).toBe('list-1');
    for (const id of ['', ' ']) expect(() => getListCellId(id, 0)).toThrow(RetikzStandardError);
    for (const index of [-1, 0.5, Infinity, NaN])
      expect(() => getListCellId('list', index)).toThrow(RetikzStandardError);
  });

  it('validates missing parent identities, data modes, and cross-cell collisions', () => {
    for (const input of [
      { namespace: 'standard', type: 'list', items: [], cellIdMode: 'index' },
      { ...base, data: ['a'], cellIdMode: 'string' },
      { ...base, items: [{ id: 'list-1', content: 'a' }, 'b'] },
      { ...base, items: ['a', { id: 'list-0', content: 'b' }] },
    ])
      expect(ListSchema.safeParse(input).success).toBe(false);
    const source = { ...base, items: [{ id: 'list-0', content: 'a' }] };
    expect(ListSchema.parse(JSON.parse(JSON.stringify(source))).items).toEqual(source.items);
  });

  it('publishes one record for generated and explicit ids and deduplicates identical names', () => {
    const result = compile([
      {
        ...base,
        items: [
          { id: 'named', content: 'a' },
          { id: 'list-1', content: 'b' },
        ],
      },
    ]);
    const handles = selectSpatialHandles(result.spatialHandles, { role: 'list-cell' });
    expect(handles).toHaveLength(2);
    expect(handles[0]).toMatchObject({ id: 'cell:list-0', aliasIds: ['cell:named'] });
    expect(handles[1]).not.toHaveProperty('aliasIds');
    expect(resolveSpatialHandle(result.spatialHandles, { id: 'cell:named' })).toBe(handles[0]);
    expect(resolveSpatialHandle(result.spatialHandles, { id: 'cell:list-0' })).toBe(handles[0]);
    expect(Object.isFrozen(handles[0]?.aliasIds)).toBe(true);
  });

  it('assigns ids only to direct data cells independently of displayed numbering', () => {
    const result = compile([{ ...base, data: ['a', ['b', 'c'], { nested: [1, 2] }], showIndex: true, indexStart: 100 }]);
    const handles = selectSpatialHandles(result.spatialHandles, { role: 'list-cell' });
    expect(handles.map(handle => handle.id)).toEqual(['cell:list-0', 'cell:list-1', 'cell:list-2']);
    expect(
      selectSpatialHandles(compile([{ ...base, data: [], showIndex: true }]).spatialHandles, { role: 'list-cell' }),
    ).toEqual([]);
  });

  it('resolves both ids through transformed layout replay without duplicated geometry', () => {
    const nested: IRChild = {
      ...base,
      items: [{ id: 'named', content: 'a' }],
      transforms: [{ kind: 'translate', x: 7, y: 11 }],
    };
    const parent: IRChild = {
      namespace: 'standard',
      type: 'list',
      items: [{ content: nested }],
      layout: { width: 120, height: 80 },
      transforms: [{ kind: 'translate', x: 50, y: 70 }],
    };
    expect(compile([parent, path('named')])).toEqual(compile([parent, path('list-0')]));
    const parentWithoutAlias: IRChild = { ...parent, items: [{ content: { ...nested, items: ['a'] } }] };
    expect(compile([parent, path('list-0')]).scene).toEqual(compile([parentWithoutAlias, path('list-0')]).scene);
    const withAlias = compile([nested]);
    const withoutAlias = compile([{ ...base, items: ['a'], transforms: [{ kind: 'translate', x: 7, y: 11 }] }]);
    expect(withAlias.scene).toEqual(withoutAlias.scene);
    expect(withAlias.artifacts).toEqual(withoutAlias.artifacts);
    expect(withAlias.spatialHandles.entries.map(entry => entry.geometry)).toEqual(
      withoutAlias.spatialHandles.entries.map(entry => entry.geometry),
    );
  });
});
