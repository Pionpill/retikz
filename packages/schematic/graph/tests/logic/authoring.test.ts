import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Graph Source authoring helpers', () => {
  it('creates semantic member records and assembles them through one Graph root', () => {
    const entity = Graph.createEntity({
      id: 'service',
      role: 'participant',
      position: [20, 30],
    });
    const relation = Graph.createRelation({
      source: { id: 'service' },
      target: { id: 'database' },
      role: 'dependency',
      route: [
        { type: 'step', kind: 'move', to: [30, 30] },
        { type: 'step', kind: 'line', to: [100, 30] },
      ],
    });
    expect(
      Graph.createGraph({ children: [entity, Graph.createEntity({ id: 'database', role: 'resource' }), relation] }),
    ).toEqual({
      namespace: 'graph',
      type: 'graph',
      children: [
        {
          namespace: 'graph',
          type: 'entity',
          id: 'service',
          role: 'participant',
          position: [20, 30],
        },
        { namespace: 'graph', type: 'entity', id: 'database', role: 'resource' },
        {
          namespace: 'graph',
          type: 'relation',
          source: { id: 'service' },
          target: { id: 'database' },
          role: 'dependency',
          route: [
            { type: 'step', kind: 'move', to: [30, 30] },
            { type: 'step', kind: 'line', to: [100, 30] },
          ],
        },
      ],
    });
  });

  it('rejects removed wrapper-era sugar while accepting direct Core-compatible fields', () => {
    expect(Graph.createEntity({ id: 'service', role: 'participant', position: [0, 0] })).toMatchObject({
      position: [0, 0],
    });
    expect(() =>
      Graph.createRelation({
        source: { id: 'service' },
        target: { id: 'database' },
        role: 'dependency',
        way: ['source', '--', 'target'],
      } as never),
    ).toThrow();
  });

  it('creates independent Block-family records without nesting them into Block grammar', () => {
    const header = Graph.createBlockHeader({ title: { text: 'Service' } });
    const section = Graph.createBlockSection({ children: [{ type: 'node', position: [0, 0], text: 'content' }] });
    const row = Graph.createBlockRow({
      children: [{ key: 'content', child: { type: 'node', position: [0, 0], text: 'row' } }],
    });

    expect(Graph.createBlock({ children: [header, section, row] })).toEqual({
      namespace: 'graph',
      type: 'block',
      children: [header, section, row],
    });
  });
});
