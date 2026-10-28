import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const minimalGraph = {
  namespace: 'graph',
  type: 'graph',
} as const;

describe('Graph 最小 Source IR', () => {
  it('接受根子数组中的有序语义成员并拒绝旧集合', () => {
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

  it('具体化 Scope 位置，同时保留省略的集合和作者默认值', () => {
    const parsed = Graph.GraphSchema.parse(minimalGraph);
    const explicit = Graph.GraphSchema.parse({ ...minimalGraph, children: [] });

    expect(parsed).toEqual({ ...minimalGraph, position: [0, 0] });
    expect(parsed).not.toHaveProperty('entities');
    expect(parsed).not.toHaveProperty('relations');
    expect(parsed).not.toHaveProperty('entityVariant');
    expect(parsed).not.toHaveProperty('theme');
    expect(parsed).not.toHaveProperty('defaultGraph');
    expect(parsed).not.toHaveProperty('graphRules');
    expect(parsed).not.toHaveProperty('children');
    expect(explicit).toMatchObject({ children: [] });
    expect(() => Graph.GraphSchema.parse({ ...minimalGraph, presentation: {} })).toThrow();
    expect(() => Graph.GraphSchema.parse({ ...minimalGraph, geometry: {} })).toThrow();
  });

  it('明确保留省略的成员字段和显式空集合', () => {
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

  it('对于仅可绘制的 Graph 内容，接受没有标识的 Entity', () => {
    const first = Graph.EntitySchema.parse({ namespace: 'graph', type: 'entity', role: 'participant' });
    const second = Graph.EntitySchema.parse({ namespace: 'graph', type: 'entity', role: 'resource' });
    const source = Graph.GraphSchema.parse({
      ...minimalGraph,
      children: [first, second],
    });

    expect(first).not.toHaveProperty('id');
    expect(source.children).toEqual([first, second]);
  });

  it('保持投影结构，而独立的 Entity 解析拥有语义默认值', () => {
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
