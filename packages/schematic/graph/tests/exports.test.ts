import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as graphExports from '../src';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
  retikz: { domain: string; releaseGroup: string };
  exports: Record<string, unknown>;
  publishConfig: { exports: Record<string, unknown> };
};

describe('@retikz/graph package boundary', () => {
  it('declares the Graph release metadata and one root export', () => {
    expect(manifest).toMatchObject({
      name: '@retikz/graph',
      version: '0.1.0-alpha.1',
      retikz: { domain: 'schematic', releaseGroup: 'graph' },
    });
    expect(Object.keys(manifest.exports)).toEqual(['.']);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.']);
  });

  it('exposes one Graph semantic compile root and Source authoring surface', () => {
    expect(graphExports.GRAPH_NAMESPACE).toBe('graph');
    expect(graphExports.GraphDefinition).toBeDefined();
    expect(graphExports.GraphProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'graph',
    });
    expect(graphExports.EntityDefinition).toBeDefined();
    expect(graphExports.EntityProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'entity',
    });
    expect(graphExports.RelationDefinition).toBeDefined();
    expect(graphExports.RelationProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'relation',
    });
    expect(graphExports.GraphSchema).toBeDefined();
    expect(graphExports.EntitySchema).toBeDefined();
    expect(graphExports.RelationSchema).toBeDefined();
    expect(graphExports).not.toHaveProperty('GraphChildSchema');
    expect(graphExports).not.toHaveProperty('GraphContentChildSchema');
    expect(graphExports).not.toHaveProperty('RelationEndpointSchema');
    expect(graphExports.createEntity).toBeTypeOf('function');
    expect(graphExports.createRelation).toBeTypeOf('function');
    expect(graphExports.createGraph).toBeTypeOf('function');
    expect(graphExports.createGraphDefinitions).toBeTypeOf('function');
    expect(graphExports.createGraphProviders).toBeTypeOf('function');
  });

  it('does not expose split member wrappers or private continuation artifacts', () => {
    expect(graphExports).not.toHaveProperty('GraphContinuationSchema');
    expect(graphExports).not.toHaveProperty('GraphContinuationProvider');
    expect(graphExports).not.toHaveProperty('GraphPresentationSchema');
    expect(graphExports).not.toHaveProperty('AuthoredGraphGeometrySchema');
    expect(graphExports).not.toHaveProperty('GraphEntityPresentationSchema');
    expect(graphExports).not.toHaveProperty('AuthoredEntityGeometrySchema');
    expect(graphExports).not.toHaveProperty('GraphRelationPresentationSchema');
    expect(graphExports).not.toHaveProperty('AuthoredRelationGeometrySchema');
    expect(graphExports).not.toHaveProperty('GraphPresentationChildSchema');
    expect(graphExports).not.toHaveProperty('GraphThemeToken');
    expect(graphExports).not.toHaveProperty('GraphEntityPortSchema');
    expect(graphExports).not.toHaveProperty('GraphRelationLabelSchema');
  });

  it('exposes the three independent member vocabularies and extension hooks', () => {
    expect(graphExports.EntityRole).toEqual({
      Participant: 'participant',
      Activity: 'activity',
      Event: 'event',
      State: 'state',
      Gateway: 'gateway',
      Resource: 'resource',
      Concept: 'concept',
    });
    expect(graphExports.RelationRole).toEqual({
      Association: 'association',
      Dependency: 'dependency',
      Generalization: 'generalization',
      Flow: 'flow',
      Influence: 'influence',
    });
    expect(graphExports.defineEntityPredicate).toBeTypeOf('function');
    expect(graphExports.defineRelationPredicate).toBeTypeOf('function');
    expect(graphExports.defineGraphThemeStyle).toBeTypeOf('function');
    expect(graphExports.GraphEntityAppearanceTokenOverridesSchema).toBeDefined();
    expect(graphExports.GraphRelationStructureTokenOverridesSchema).toBeDefined();
    expect(graphExports.GraphRelationAppearanceTokenOverridesSchema).toBeDefined();
    for (const name of [
      'EntityVariant',
      'EntityVariantSchema',
      'EntityVariantValue',
      'EntityVariantDefinition',
      'defineEntityVariant',
      'resolveEntityVariantRegistry',
      'BUILTIN_ENTITY_VARIANT_DEFINITIONS',
      'RelationVariant',
      'RelationVariantSchema',
      'RelationVariantValue',
      'RelationVariantDefinition',
      'defineRelationVariant',
      'resolveRelationVariantRegistry',
      'BUILTIN_RELATION_VARIANT_DEFINITIONS',
    ]) {
      expect(graphExports).not.toHaveProperty(name);
    }
  });

  it('rejects the former namespace and does not register the former role vocabulary', () => {
    expect(() =>
      graphExports.EntitySchema.parse({ namespace: 'notation', type: 'entity', id: 'legacy', role: 'stage' }),
    ).toThrow();
    expect(
      graphExports.EntitySchema.parse({ namespace: 'graph', type: 'entity', id: 'legacy', role: 'stage' }),
    ).toEqual({
      namespace: 'graph',
      type: 'entity',
      id: 'legacy',
      role: 'stage',
    });
    expect(graphExports.BUILTIN_ENTITY_ROLE_DEFINITIONS.some(definition => definition.role === 'stage')).toBe(false);
  });
});
