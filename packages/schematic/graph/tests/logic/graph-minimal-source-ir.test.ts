import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const minimalGraph = {
  namespace: 'graph',
  type: 'graph',
} as const;

describe('Graph minimal Source IR', () => {
  it('accepts ordered semantic members in the root children array and rejects legacy collections', () => {
    const parsed = Graph.GraphSchema.parse({
      ...minimalGraph,
      children: [
        { namespace: 'graph', type: 'entity', id: 'service', role: 'participant' },
        {
          namespace: 'graph',
          type: 'relation',
          source: { id: 'service' },
          target: { id: 'service' },
          role: 'association',
        },
      ],
    });

    expect(parsed.children?.map(child => ('id' in child ? child.id : undefined))).toEqual(['service', undefined]);
    expect(parsed).not.toHaveProperty('entities');
    expect(() => Graph.GraphSchema.parse({ ...minimalGraph, entities: [] })).toThrow();
  });

  it('preserves omitted root fields instead of materializing collections, defaults, or wrappers', () => {
    const parsed = Graph.GraphSchema.parse(minimalGraph);
    const explicit = Graph.GraphSchema.parse({ ...minimalGraph, children: [] });

    expect(parsed).toEqual(minimalGraph);
    expect(parsed).not.toHaveProperty('entities');
    expect(parsed).not.toHaveProperty('relations');
    expect(parsed).not.toHaveProperty('entityVariant');
    expect(parsed).not.toHaveProperty('theme');
    expect(parsed).not.toHaveProperty('graphTheme');
    expect(parsed).not.toHaveProperty('children');
    expect(explicit).toMatchObject({ children: [] });
    expect(() => Graph.GraphSchema.parse({ ...minimalGraph, presentation: {} })).toThrow();
    expect(() => Graph.GraphSchema.parse({ ...minimalGraph, geometry: {} })).toThrow();
  });

  it('preserves omitted member fields and explicit empty collections distinctly', () => {
    const entity = Graph.EntitySchema.parse({ namespace: 'graph', type: 'entity', id: 'service', role: 'participant' });
    const relation = Graph.RelationSchema.parse({
      namespace: 'graph',
      type: 'relation',
      source: { id: 'service' },
      target: { id: 'database' },
      role: 'dependency',
    });
    expect(entity).not.toHaveProperty('variant');
    expect(entity).not.toHaveProperty('ports');
    expect(entity).not.toHaveProperty('position');
    expect(relation).not.toHaveProperty('direction');
    expect(relation).not.toHaveProperty('route');
    expect(relation).not.toHaveProperty('id');
  });

  it('accepts an Entity without identity for drawable-only Graph content', () => {
    const first = Graph.EntitySchema.parse({ namespace: 'graph', type: 'entity', role: 'participant' });
    const second = Graph.EntitySchema.parse({ namespace: 'graph', type: 'entity', role: 'resource' });
    const source = Graph.GraphSchema.parse({
      ...minimalGraph,
      children: [first, second],
    });

    expect(first).not.toHaveProperty('id');
    expect(source.children).toEqual([first, second]);
  });

  it('keeps projection structural while independent Entity resolve owns semantic defaults', () => {
    const source = Graph.GraphSchema.parse({
      ...minimalGraph,
      children: [{ namespace: 'graph', type: 'entity', id: 'service', role: 'participant' }],
    });
    const definitions = Graph.resolveGraphDefinitionOptions();
    const projected = Graph.resolveGraph(source, definitions);

    expect(source).not.toHaveProperty('relations');
    const sourceEntity = source.children?.find(child => 'namespace' in child && child.type === 'entity');
    expect(sourceEntity).not.toHaveProperty('variant');
    expect(projected).toEqual(source.children);
    expect(Graph.resolveEntity(sourceEntity as Graph.IRGraphEntity, definitions)).not.toHaveProperty(
      'effectiveVariant',
    );
    expect(Graph.resolveEntity(sourceEntity as Graph.IRGraphEntity, definitions)).not.toHaveProperty(
      'variantDefinition',
    );
  });
});
