import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Graph provider closure', () => {
  it('installs Graph, Entity and Relation through semantic provider dependencies', () => {
    const resolved = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });

    expect(resolved.composites?.map(definition => `${definition.namespace}.${definition.type}`).sort()).toEqual(
      ['graph.entity', 'graph.graph', 'graph.relation'].sort(),
    );
    expect(resolved.shapes?.map(definition => definition.name).sort()).toEqual(['cylinder', 'hexagon']);
    expect(resolved.arrows?.map(definition => definition.name).sort()).toEqual(
      ['diamond', 'kite', 'openDiamond', 'square'].sort(),
    );
  });

  it('compiles the same custom definitions through Graph, Entity and Relation roots without dataset conflict', () => {
    const entityRole = Graph.defineEntityRole({
      role: 'custom-entity',
      description: 'Custom Entity role',
      shape: 'rectangle',
      padding: 4,
    });
    const relationRole = Graph.defineRelationRole({
      role: 'custom-relation',
      description: 'Custom Relation role',
      defaultDirection: 'none',
      allowedDirections: ['none'],
      directions: { none: { sourceMarker: false, targetMarker: false, dashPattern: false } },
    });
    const options = { entityRoles: [entityRole], relationRoles: [relationRole] };
    const providers = Graph.createGraphProviders(options);
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        { roots: [Graph.GraphProviderKey], providers },
        { roots: [Graph.EntityProviderKey], providers },
        { roots: [Graph.RelationProviderKey], providers },
      ],
    });
    const semanticChildren = [
      {
        namespace: 'graph' as const,
        type: 'entity' as const,
        id: 'source',
        role: 'custom-entity',
        position: [0, 0] as const,
      },
      {
        namespace: 'graph' as const,
        type: 'entity' as const,
        id: 'target',
        role: 'custom-entity',
        position: [100, 0] as const,
      },
      {
        namespace: 'graph' as const,
        type: 'relation' as const,
        source: { id: 'source' },
        target: { id: 'target' },
        role: 'custom-relation',
      },
    ];

    expect(() =>
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [{ namespace: 'graph', type: 'graph', children: semanticChildren }],
        },
        { ...definitions, padding: 0 },
      ),
    ).not.toThrow();
    expect(() =>
      compileToScene({ type: 'scene', version: 1, children: semanticChildren }, { ...definitions, padding: 0 }),
    ).not.toThrow();
  });
});
