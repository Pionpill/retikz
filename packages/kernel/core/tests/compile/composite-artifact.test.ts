import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import { compileToScene, CompositeBaseSchema, defineComposite } from '../../src';

describe('Composite 产物交付', () => {
  it('分别交付多个实例的领域值和最终定位，并隔离冻结嵌套快照', () => {
    const payload = { nested: { count: 1 } };
    const definition = defineComposite({
      namespace: 'test',
      type: 'artifact',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('artifact') }),
      artifactSchema: strictObject({ nested: strictObject({ count: number() }) }),
      compile: () => ({ children: [], artifact: payload }),
    });
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          { namespace: 'test', type: 'artifact' },
          { type: 'node', position: [0, 0] },
          { namespace: 'test', type: 'artifact' },
        ],
      },
      { composites: [definition] },
    );

    payload.nested.count = 2;
    expect(Object.keys(result).sort()).toEqual(['artifacts', 'scene']);
    expect(result.artifacts).toEqual(
      [0, 2].map(index => ({
        namespace: 'test',
        type: 'artifact',
        occurrence: { sourcePath: ['children', index], expansionPath: [] },
        value: { nested: { count: 1 } },
      })),
    );
    expect(Object.isFrozen(result.artifacts)).toBe(true);
    expect(Object.isFrozen(result.artifacts[0].occurrence.sourcePath)).toBe(true);
    expect(Object.isFrozen(result.artifacts[0].value.nested)).toBe(true);
  });

  it('区分缺省产物与 null 领域值，空场景交付空数组', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'nullable',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nullable'),
        present: literal(true).optional(),
      }),
      artifactSchema: literal(null),
      compile: node => (node.present ? { children: [], artifact: null } : { children: [] }),
    });
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          { namespace: 'test', type: 'nullable' },
          { namespace: 'test', type: 'nullable', present: true },
        ],
      },
      { composites: [definition] },
    );

    expect(result.artifacts).toEqual([
      {
        namespace: 'test',
        type: 'nullable',
        occurrence: { sourcePath: ['children', 1], expansionPath: [] },
        value: null,
      },
    ]);
    expect(compileToScene({ version: 1, type: 'scene', children: [] }).artifacts).toEqual([]);
  });
});
