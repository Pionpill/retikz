import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Graph 提供者关闭', () => {
  it('安装完整的 Graph 系列以及 Group 和 Block 组合依赖项', () => {
    const resolved = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });

    expect(resolved.composites?.map(definition => `${definition.namespace}.${definition.type}`).sort()).toEqual(
      [
        'graph.block',
        'graph.blockHeader',
        'graph.blockRow',
        'graph.blockSection',
        'graph.entity',
        'graph.graph',
        'graph.group',
        'graph.group-body-allocation',
        'graph.relation',
        'layout.flexLayout',
        'standard.surface',
      ].sort(),
    );
    expect(resolved.shapes?.map(definition => definition.name).sort()).toEqual(['ellipticCapsule', 'hexagon']);
    expect(resolved.arrows?.map(definition => definition.name).sort()).toEqual(
      ['diamond', 'openDiamond', 'square', 'straightBarb'].sort(),
    );
    expect(resolved.clips?.map(definition => definition.kind)).toEqual(['path']);
  });

  it('通过 Graph、Entity 和 Relation 根编译相同的自定义定义，而不会发生数据集冲突', () => {
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
        { roots: [Graph.entityProviderKey], providers },
        { roots: [Graph.relationProviderKey], providers },
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
