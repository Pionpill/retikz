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

describe('@retikz/graph 封装边界', () => {
  it('声明 Graph 版本元数据和一个根导出', () => {
    expect(manifest).toMatchObject({
      name: '@retikz/graph',
      version: '0.1.0-alpha.3',
      retikz: { domain: 'schematic', releaseGroup: 'graph' },
    });
    expect(Object.keys(manifest.exports)).toEqual(['.']);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.']);
  });

  it('公开一个 Graph 语义编译根和 Source 编写表面', () => {
    expect(graphExports.GRAPH_NAMESPACE).toBe('graph');
    expect(graphExports.graphDefinition).toBeDefined();
    expect(graphExports.GraphProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'graph',
    });
    expect(graphExports.entityDefinition).toBeDefined();
    expect(graphExports.entityProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'entity',
    });
    expect(graphExports.relationDefinition).toBeDefined();
    expect(graphExports.relationProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'relation',
    });
    expect(graphExports.blockDefinition).toBeDefined();
    expect(graphExports.blockProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'block',
    });
    expect(graphExports.blockHeaderDefinition).toBeDefined();
    expect(graphExports.blockHeaderProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'blockHeader',
    });
    expect(graphExports.blockSectionDefinition).toBeDefined();
    expect(graphExports.blockSectionProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'blockSection',
    });
    expect(graphExports.blockRowDefinition).toBeDefined();
    expect(graphExports.blockRowProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'blockRow',
    });
    expect(graphExports.GraphSchema).toBeDefined();
    expect(graphExports.GraphDefaultsSchema).toBeDefined();
    expect(graphExports.GraphRuleSchema).toBeDefined();
    expect(graphExports.GraphEntityDefaultsSchema).toBeDefined();
    expect(graphExports.GraphEntityDefaultsStyleSchema).toBeDefined();
    expect(graphExports.GraphEntityDefaultsLayoutSchema).toBeDefined();
    expect(graphExports.GraphEntityRuleSchema).toBeDefined();
    expect(graphExports.GraphEntityRuleStyleSchema).toBeDefined();
    expect(graphExports.GraphRelationDefaultsSchema).toBeDefined();
    expect(graphExports.GraphRelationDefaultsStyleSchema).toBeDefined();
    expect(graphExports.GraphRelationRuleSchema).toBeDefined();
    expect(graphExports.GraphSurfaceDefaultsSchema).toBeDefined();
    expect(graphExports.EntitySchema).toBeDefined();
    expect(graphExports.RelationSchema).toBeDefined();
    expect(graphExports.BlockSchema).toBeDefined();
    expect(graphExports.BlockHeaderSchema).toBeDefined();
    expect(graphExports.BlockSectionSchema).toBeDefined();
    expect(graphExports.BlockRowSchema).toBeDefined();
    expect(graphExports).not.toHaveProperty('BlockCellSchema');
    expect(graphExports).not.toHaveProperty('GraphChildSchema');
    expect(graphExports).not.toHaveProperty('GraphContentChildSchema');
    expect(graphExports).not.toHaveProperty('RelationEndpointSchema');
    expect(graphExports.createEntity).toBeTypeOf('function');
    expect(graphExports.createRelation).toBeTypeOf('function');
    expect(graphExports.createGraph).toBeTypeOf('function');
    expect(graphExports.createBlock).toBeTypeOf('function');
    expect(graphExports.createBlockHeader).toBeTypeOf('function');
    expect(graphExports.createBlockSection).toBeTypeOf('function');
    expect(graphExports.createBlockRow).toBeTypeOf('function');
    expect(graphExports.createGraphDefinitions).toBeTypeOf('function');
    expect(graphExports.createGraphProviders).toBeTypeOf('function');
  });

  it('不公开拆分成员包装器或私有延续产物', () => {
    expect(graphExports).not.toHaveProperty('BlockCellDefinition');
    expect(graphExports).not.toHaveProperty('BlockCellProviderKey');
    expect(graphExports).not.toHaveProperty('BlockRegionSchema');
    expect(graphExports).not.toHaveProperty('InternalBlockRegionProvider');
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

  it('公开三个独立的成员词汇表和扩展钩子', () => {
    expect(graphExports.BuiltinEntityRole).toEqual({
      Participant: 'participant',
      Activity: 'activity',
      Event: 'event',
      State: 'state',
      Gateway: 'gateway',
      Resource: 'resource',
      Concept: 'concept',
    });
    expect(graphExports.BuiltinRelationRole).toEqual({
      Association: 'association',
      Dependency: 'dependency',
      Generalization: 'generalization',
      Flow: 'flow',
      Influence: 'influence',
    });
    expect(graphExports.defineEntityPredicate).toBeTypeOf('function');
    expect(graphExports.defineRelationPredicate).toBeTypeOf('function');
    expect(graphExports.defineGraphTheme).toBeTypeOf('function');
    expect(graphExports.GraphRelationStructureTokenOverridesSchema).toBeDefined();

    for (const name of [
      'GraphEntityAppearanceTokenOverridesSchema',
      'GraphRelationAppearanceTokenOverridesSchema',
      'GraphEntityThemeRuleSchema',
      'GraphRelationThemeRuleSchema',
      'GraphThemeRuleSchema',
      'GraphThemeLayerSchema',
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

  it('拒绝原命名空间，不注册原角色词汇', () => {
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
