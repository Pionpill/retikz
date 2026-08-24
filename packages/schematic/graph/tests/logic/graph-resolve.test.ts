import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const entity = (id: string, input: Record<string, unknown> = {}) => ({
  namespace: 'graph' as const,
  type: 'entity' as const,
  id,
  role: 'activity',
  position: [0, 0] as const,
  ...input,
});

describe('Graph context projection', () => {
  it('preserves arbitrary Core child order while projecting Entity and Relation context', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphTheme: {
        rules: [
          { type: 'entity', appearance: { fill: '#ef4444' } },
          { type: 'relation', appearance: { stroke: '#2563eb' } },
        ],
      },
      children: [
        { type: 'node', id: 'plain', position: [0, 0] },
        entity('service'),
        {
          namespace: 'graph',
          type: 'relation',
          source: { id: 'plain' },
          target: { id: 'service' },
          role: 'association',
        },
      ],
    });

    expect(Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions())).toEqual([
      { type: 'node', id: 'plain', position: [0, 0] },
      { ...entity('service'), fill: '#ef4444' },
      {
        namespace: 'graph',
        type: 'relation',
        source: { id: 'plain' },
        target: { id: 'service' },
        role: 'association',
        stroke: '#2563eb',
      },
    ]);
  });

  it('crosses ordinary Scope and resets graphTheme at Core Theme boundaries', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphTheme: { rules: [{ type: 'entity', appearance: { fill: '#ef4444' } }] },
      children: [
        { type: 'scope', children: [entity('inherited')] },
        { type: 'scope', theme: { mode: 'dark' }, children: [entity('reset')] },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toMatchObject({
      type: 'scope',
      children: [{ id: 'inherited', fill: '#ef4444' }],
    });
    expect(projected[1]).toMatchObject({
      type: 'scope',
      theme: { mode: 'dark' },
      children: [{ id: 'reset' }],
    });
    expect((projected[1] as { children: Array<Record<string, unknown>> }).children[0]).not.toHaveProperty('fill');
  });

  it('merges nested Graph context and leaves third-party composite payload opaque', () => {
    const opaque = {
      namespace: 'custom',
      type: 'opaque',
      payload: entity('hidden'),
    } as const;
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphTheme: { rules: [{ type: 'entity', appearance: { opacity: 0.5 } }] },
      children: [
        opaque,
        {
          namespace: 'graph',
          type: 'graph',
          graphTheme: { rules: [{ type: 'entity', appearance: { fill: '#22c55e' } }] },
          children: [entity('nested', { fill: '#ffffff' })],
        },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toEqual(opaque);
    expect(projected[1]).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [{ id: 'nested', opacity: 0.5, fill: '#ffffff' }],
    });
  });
});
