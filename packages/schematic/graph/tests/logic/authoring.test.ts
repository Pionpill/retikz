import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Graph Source 编写助手', () => {
  it('创建语义成员记录并通过一个 Graph 根组装它们', () => {
    const entity = Graph.createEntity({
      id: 'service',
      role: 'participant',
      position: [20, 30],
    });
    const relation = Graph.createRelation({
      source: { id: 'service' },
      target: { id: 'database' },
      role: 'dependency',
      kind: 'domain.dependency',
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
          kind: 'domain.dependency',
          route: [
            { type: 'step', kind: 'move', to: [30, 30] },
            { type: 'step', kind: 'line', to: [100, 30] },
          ],
        },
      ],
    });
  });

  it('拒绝去除包装时代的糖，同时接受直接的 Core 兼容字段', () => {
    expect(Graph.createEntity({ id: 'service', role: 'participant', position: [0, 0] })).toMatchObject({
      position: [0, 0],
    });
    expect(() =>
      Graph.RelationSchema.parse({
        namespace: 'graph',
        type: 'relation',
        source: { id: 'service' },
        target: { id: 'database' },
        role: 'dependency',
        way: ['source', '--', 'target'],
      }),
    ).toThrow();
  });

  it('创建独立的 Block 系列记录，而不将它们嵌套到 Block 语法中', () => {
    const header = Graph.createBlockHeader({ title: { text: 'Service' } });
    const section = Graph.createBlockSection({ children: [{ type: 'node', position: [0, 0], text: 'content' }] });
    const row = Graph.createBlockRow({
      children: [{ type: 'node', position: [0, 0], text: 'row' }],
    });

    expect(Graph.createBlock({ children: [header, section, row] })).toEqual({
      namespace: 'graph',
      type: 'block',
      children: [header, section, row],
    });
  });
});
