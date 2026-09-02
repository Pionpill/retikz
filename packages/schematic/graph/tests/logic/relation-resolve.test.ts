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
  it('defaults association to forward navigation while preserving explicit directions', () => {
    const context = Graph.resolveGraphDefinitionOptions();

    expect(Graph.resolveRelation(relation(), context).effectiveDirection).toBe('forward');
    expect(Graph.resolveRelation(relation({ direction: 'none' }), context).effectiveDirection).toBe('none');
  });

  it('resolves UML realization through the dependency role without endpoint projection', () => {
    const canonical = Graph.resolveRelation(
      relation({ id: 'realizes', role: 'dependency', kind: 'uml.realization' }),
      Graph.resolveGraphDefinitionOptions(),
    );

    expect(canonical).toMatchObject({
      effectiveDirection: 'forward',
      kindDefinition: { kind: 'uml.realization', role: 'dependency' },
      source: { source: { id: 'source' }, target: { id: 'target' } },
    });
    expect(Graph.resolveRelationStructure(canonical)).toEqual({
      sourceMarker: false,
      targetMarker: { shape: 'open' },
      dashPattern: [6, 4],
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

  it('rejects removed kinds and UML kinds under another role', () => {
    const context = Graph.resolveGraphDefinitionOptions();

    expect(() =>
      Graph.resolveRelation(relation({ id: 'provenance', role: 'dependency', kind: 'provenance.derivation' }), context),
    ).toThrow(/provenance\.derivation.*not registered/i);
    expect(() =>
      Graph.resolveRelation(relation({ id: 'usage', role: 'dependency', kind: 'uml.usage' }), context),
    ).toThrow(/uml\.usage.*not registered/i);
    expect(() =>
      Graph.resolveRelation(relation({ id: 'wrong-role', role: 'generalization', kind: 'uml.realization' }), context),
    ).toThrow(/uml\.realization.*dependency.*generalization/i);
  });
});
