import { describe, expect, it } from 'vitest';

import type { QualifiedSpatialHandle, SpatialHandleIndex } from '../../../src';
import { resolveSpatialHandle, selectSpatialHandles } from '../../../src';

const occurrence = (sourcePath: string, index = 0) => ({
  sourcePath,
  expansionPath: [{ kind: 'expand' as const, index }],
});

const entry = (
  id: string,
  ownerId: string | undefined,
  ancestors: ReadonlyArray<{ namespace: string; type: string; instanceId?: string }>,
  tags: ReadonlyArray<string>,
): QualifiedSpatialHandle => {
  const ownerOccurrence = occurrence(`children[${id}]`);
  return {
    ownerPath: [
      ...ancestors.map((owner, index) => ({ ...owner, occurrence: occurrence(`ancestor[${index}]`) })),
      {
        namespace: 'third',
        type: 'card',
        ...(ownerId === undefined ? {} : { instanceId: ownerId }),
        occurrence: ownerOccurrence,
      },
    ],
    id,
    role: 'card',
    geometry: { kind: 'rect', bounds: { x: 0, y: 0, width: 10, height: 10 } },
    tags,
    finalOccurrence: ownerOccurrence,
    originOccurrence: ownerOccurrence,
  };
};

const entries = [
  entry('a', 'card-a', [{ namespace: 'third', type: 'panel', instanceId: 'panel-a' }], ['content', 'primary']),
  entry(
    'b',
    undefined,
    [
      { namespace: 'third', type: 'dashboard' },
      { namespace: 'third', type: 'panel', instanceId: 'panel-b' },
    ],
    ['content'],
  ),
  entry('c', 'card-c', [{ namespace: 'other', type: 'panel' }], ['secondary']),
] as const;
const index: SpatialHandleIndex = { entries };

describe('spatial handle query', () => {
  it('returns one identical entry for its primary id and aliases', () => {
    const aliased = Object.freeze({ ...entries[0], aliasIds: Object.freeze(['other', 'third']) });
    const aliasedIndex = { entries: [aliased] };
    expect(resolveSpatialHandle(aliasedIndex, { id: 'other' })).toBe(aliased);
    expect(resolveSpatialHandle(aliasedIndex, { id: 'a' })).toBe(aliased);
    expect(selectSpatialHandles(aliasedIndex, {})).toEqual([aliased]);
    expect(() =>
      resolveSpatialHandle({ entries: [aliased, { ...entries[1], aliasIds: ['other'] }] }, { id: 'other' }),
    ).toThrow(/ambiguity/);
  });
  it('matches owner fields together, id, role, and all requested tags in index order', () => {
    expect(
      selectSpatialHandles(index, {
        owner: {
          namespace: 'third',
          type: 'card',
          instanceId: 'card-a',
          occurrence: entries[0].ownerPath[1].occurrence,
        },
        id: 'a',
        role: 'card',
        tags: ['primary', 'content'],
      }),
    ).toEqual([entries[0]]);
    expect(selectSpatialHandles(index, { owner: { namespace: 'third' }, tags: ['content'] })).toEqual([
      entries[0],
      entries[1],
    ]);
  });

  it('matches within as an ordered continuous ancestor subpath, not unordered containment', () => {
    expect(
      selectSpatialHandles(index, {
        within: [{ namespace: 'third', type: 'panel', instanceId: 'panel-b' }],
      }),
    ).toEqual([entries[1]]);
    expect(
      selectSpatialHandles(index, {
        within: [
          { namespace: 'third', type: 'dashboard' },
          { namespace: 'third', type: 'panel' },
        ],
      }),
    ).toEqual([entries[1]]);
    expect(
      selectSpatialHandles(index, {
        within: [
          { namespace: 'third', type: 'panel' },
          { namespace: 'third', type: 'dashboard' },
        ],
      }),
    ).toEqual([]);
  });

  it('resolves exactly one entry and fails loudly for miss or ambiguity', () => {
    expect(resolveSpatialHandle(index, { id: 'a' })).toBe(entries[0]);
    expect(() => resolveSpatialHandle(index, { id: 'missing' })).toThrow(/miss.*missing/i);
    expect(() => resolveSpatialHandle(index, { role: 'card' })).toThrow(/ambig.*card/i);
  });
});
