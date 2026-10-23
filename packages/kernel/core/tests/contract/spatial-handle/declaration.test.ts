import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { IRScene, SpatialHandleDeclaration } from '../../../src';
import { compileToScene, CompositeBaseSchema, defineComposite } from '../../../src';

const scene: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'third', type: 'card' }],
};

const defineCard = (spatialHandles: ReadonlyArray<SpatialHandleDeclaration>) =>
  defineComposite({
    namespace: 'third',
    type: 'card',
    schema: CompositeBaseSchema.extend({
      namespace: literal('third'),
      type: literal('card'),
    }),
    compile: () => ({ children: [], spatialHandles }),
  });

const valid = {
  id: 'body',
  role: 'card',
  bounds: { x: -10, y: 4, width: 20, height: 12 },
  tags: ['content', 'primary'],
  payload: { itemId: 'a', rank: 1 },
} satisfies SpatialHandleDeclaration;

describe('spatial handle declaration contract', () => {
  it('accepts a detached JSON-safe declaration at the callback boundary', () => {
    expect(() => compileToScene(scene, { composites: [defineCard([valid])] })).not.toThrow();
  });

  it.each([
    ['repeated alias', { ...valid, aliasIds: ['a', 'a'] }],
    ['primary alias', { ...valid, aliasIds: ['body'] }],
    ['non-finite x', { ...valid, bounds: { ...valid.bounds, x: Number.NaN } }],
    ['non-finite y', { ...valid, bounds: { ...valid.bounds, y: Number.POSITIVE_INFINITY } }],
    ['non-finite width', { ...valid, bounds: { ...valid.bounds, width: Number.NaN } }],
    ['non-finite height', { ...valid, bounds: { ...valid.bounds, height: Number.NEGATIVE_INFINITY } }],
    ['negative width', { ...valid, bounds: { ...valid.bounds, width: -1 } }],
    ['negative height', { ...valid, bounds: { ...valid.bounds, height: -1 } }],
    ['duplicate tag', { ...valid, tags: ['content', 'content'] }],
  ])('rejects %s', (_label, declaration) => {
    expect(() => compileToScene(scene, { composites: [defineCard([declaration])] })).toThrow(/spatial handle/i);
  });

  it('rejects duplicate owner-local keys', () => {
    expect(() =>
      compileToScene(scene, {
        composites: [defineCard([valid, { ...valid, role: 'duplicate-role' }])],
      }),
    ).toThrow(/spatial handle.*duplicate.*body/i);
  });

  it('rejects aliases colliding with another declaration and keeps aliases detached', () => {
    expect(() =>
      compileToScene(scene, {
        composites: [
          defineCard([
            { ...valid, aliasIds: ['other'] },
            { ...valid, id: 'other' },
          ]),
        ],
      }),
    ).toThrow(/duplicate/i);

    const aliasIds = ['alternate'];
    const result = compileToScene(scene, { composites: [defineCard([{ ...valid, aliasIds }])] });
    aliasIds.push('later');

    expect(result.spatialHandles.entries[0]?.aliasIds).toEqual(['alternate']);
    expect(Object.isFrozen(result.spatialHandles.entries[0]?.aliasIds)).toBe(true);
  });
});
