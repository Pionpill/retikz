import type { IRChild, IRStep } from '@retikz/core';

import { lowerIRToKernel, parseWay } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRRelation } from '../../src';

import * as Graph from '../../src';

const steps: Array<IRStep> = [
  { type: 'step', kind: 'move', to: { id: 'source' } },
  { type: 'step', kind: 'fold', via: '-|-', to: { id: 'target' } },
];

const sceneOf = (children: ReadonlyArray<IRChild>) => ({
  version: 1 as const,
  type: 'scene' as const,
  children: Array.from(children),
});

const lowerConnector = (connector: IRRelation) => {
  const lowered = lowerIRToKernel(sceneOf([connector]), { composites: [Graph.RelationDefinition] });
  const child = lowered.children[0];
  if (child.type !== 'path') throw new Error('Expected Relation to lower to a Core Path');
  return child;
};

describe('Relation canonical semantic IR', () => {
  it('keeps one Relation schema with a closed relation role', () => {
    const connector = Graph.createRelation({ id: 'flow', role: 'flow', children: steps });

    expect(connector).toEqual({
      namespace: 'graph',
      type: 'relation',
      id: 'flow',
      role: 'flow',
      children: steps,
      marks: [{ pos: 1, mark: { kind: 'arrow' } }],
    });
    expect(Graph.RelationSchema.parse(JSON.parse(JSON.stringify(connector)))).toEqual(connector);
    expect(Graph.RelationSchema.safeParse({ ...connector, role: 'custom' }).success).toBe(false);
  });

  it('normalizes Draw way syntax through the Core parser', () => {
    const way = ['source', '-|-', 'target'] as const;
    const connector = Graph.createRelation({ id: 'draw', role: 'flow', way: Array.from(way) });

    expect(connector.children).toEqual(parseWay(Array.from(way)));
    expect(connector).not.toHaveProperty('way');
  });

  it('requires exactly one authoring path source and a relation role', () => {
    expect(() => Graph.createRelation({ id: 'missing', role: 'flow' } as never)).toThrow(/exactly one/i);
    expect(() => Graph.createRelation({ id: 'both', role: 'flow', children: steps, way: ['a', 'b'] } as never)).toThrow(
      /exactly one/i,
    );
  });
});

describe('Relation lowering', () => {
  it('lowers to one same-id Core stroke Path and discards the semantic role', () => {
    const path = lowerConnector(Graph.createRelation({ id: 'branch', role: 'branch', children: steps }));

    expect(path).toMatchObject({ type: 'path', id: 'branch', children: steps });
    expect(path).not.toHaveProperty('namespace');
    expect(path).not.toHaveProperty('role');
  });

  it('adds a terminal arrow only when marks are omitted', () => {
    const withDefault = lowerConnector(Graph.createRelation({ id: 'default', role: 'flow', children: steps }));
    const withoutMarks = lowerConnector(
      Graph.createRelation({ id: 'empty', role: 'flow', children: steps, marks: [] }),
    );

    expect(withDefault.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);
    expect(withoutMarks.marks).toEqual([]);
  });
});
