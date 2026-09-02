import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const relation = (input: Record<string, unknown> = {}) =>
  Graph.RelationSchema.parse({
    namespace: 'graph',
    type: 'relation',
    source: { id: 'source' },
    target: { id: 'target' },
    role: 'association',
    ...input,
  });

describe('Relation data resolution', () => {
  it('defaults association to forward while preserving explicit none', () => {
    const context = Graph.resolveGraphDefinitionOptions();

    expect(Graph.resolveRelation(relation(), context).effectiveDirection).toBe('forward');
    expect(Graph.resolveRelation(relation({ direction: 'none' }), context).effectiveDirection).toBe('none');
  });

  it('resolves semantic definitions without Graph membership or endpoint projection', () => {
    const canonical = Graph.resolveRelation(
      relation({ id: 'realizes', role: 'generalization', kind: 'uml.realization' }),
      Graph.resolveGraphDefinitionOptions(),
    );

    expect(canonical).toMatchObject({
      effectiveDirection: 'forward',
      kindDefinition: { kind: 'uml.realization', role: 'generalization' },
      source: { source: { id: 'source' }, target: { id: 'target' } },
    });
    expect(canonical).not.toHaveProperty('sourceEntityId');
    expect(canonical).not.toHaveProperty('targetEntityId');
  });

  it('preserves complete Core NodeTargets for later Core resolution', () => {
    const source = { id: 'node', anchor: { side: 'right', fraction: 0.25 }, offset: [2, -3], boundary: 'shape' };
    const target = { id: 'scope', anchor: 'west' };
    const canonical = Graph.resolveRelation(relation({ source, target }), Graph.resolveGraphDefinitionOptions());

    expect(canonical.source.source).toEqual(source);
    expect(canonical.source.target).toEqual(target);
  });

  it('rejects an explicit direction outside the selected role and kind subset', () => {
    expect(() =>
      Graph.resolveRelation(
        relation({ id: 'invalid-direction', role: 'dependency', direction: 'reverse' }),
        Graph.resolveGraphDefinitionOptions(),
      ),
    ).toThrow(/invalid-direction.*reverse.*not allowed/i);
  });
});
