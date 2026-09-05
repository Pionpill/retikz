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
      graphRules: [
        { type: 'entity', style: { fill: '#ef4444' } },
        { type: 'relation', style: { stroke: '#2563eb' } },
      ],
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
      { ...entity('service'), style: { fill: '#ef4444' } },
      {
        namespace: 'graph',
        type: 'relation',
        source: { id: 'plain' },
        target: { id: 'service' },
        role: 'association',
        style: { stroke: '#2563eb' },
      },
    ]);
  });

  it('crosses ordinary Scope while preserving Graph author layers at Core Theme boundaries', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [{ type: 'entity', style: { fill: '#ef4444' } }],
      children: [
        { type: 'scope', children: [entity('inherited')] },
        { type: 'scope', theme: { mode: 'dark' }, children: [entity('reset')] },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toMatchObject({
      type: 'scope',
      children: [{ id: 'inherited', style: { fill: '#ef4444' } }],
    });
    expect(projected[1]).toMatchObject({
      type: 'scope',
      theme: { mode: 'dark' },
      children: [{ id: 'reset', style: { fill: '#ef4444' } }],
    });
    expect((projected[1] as { children: Array<Record<string, unknown>> }).children[0]).toHaveProperty(
      'style.fill',
      '#ef4444',
    );
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
      graphRules: [{ type: 'entity', style: { opacity: 0.5 } }],
      children: [
        opaque,
        {
          namespace: 'graph',
          type: 'graph',
          graphRules: [{ type: 'entity', style: { fill: '#22c55e' } }],
          children: [entity('nested', { style: { fill: '#ffffff' } })],
        },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toEqual(opaque);
    expect(projected[1]).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [{ id: 'nested', style: { opacity: 0.5, fill: '#ffffff' } }],
    });
  });

  it('lets an inner Graph default outrank an outer Graph rule', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [{ type: 'entity', style: { fill: '#ef4444' } }],
      children: [
        {
          namespace: 'graph',
          type: 'graph',
          graphDefaults: { entity: { style: { fill: '#2563eb' } } },
          children: [entity('nested')],
        },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [{ id: 'nested', style: { fill: '#2563eb' } }],
    });
  });
});
