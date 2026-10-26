import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const theme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
} as const;

const relation = (input: Record<string, unknown> = {}) =>
  Graph.RelationSchema.parse({
    namespace: 'graph',
    type: 'relation',
    source: { id: 'source' },
    target: { id: 'target' },
    role: 'association',
    ...input,
  });

const realization = Graph.defineRelationKind({
  kind: 'uml.realization',
  role: 'dependency',
  description: 'User-defined realization',
  directions: { forward: { targetMarker: { shape: 'open' }, dashPattern: [6, 4] } },
});

describe('Relation 数据解析结果', () => {
  it('默认关联到正向导航，同时保留明确的方向', () => {
    const context = Graph.resolveGraphDefinitionOptions();

    expect(Graph.resolveRelation(relation(), context).effectiveDirection).toBe('forward');
    expect(Graph.resolveRelation(relation({ direction: 'none' }), context).effectiveDirection).toBe('none');
  });

  it('通过其角色解析显式注册的类型，无需端点投影', () => {
    const canonical = Graph.resolveRelation(
      relation({ id: 'realizes', role: 'dependency', kind: 'uml.realization' }),
      Graph.resolveGraphDefinitionOptions({ relationKinds: [realization] }),
    );

    expect(canonical).toMatchObject({
      effectiveDirection: 'forward',
      kindDefinition: { kind: 'uml.realization', role: 'dependency' },
      source: { source: { id: 'source' }, target: { id: 'target' } },
    });
    expect(Graph.resolveRelationStructure(canonical, { ...Graph.resolveGraphDefinitionOptions(), theme })).toEqual({
      sourceMarker: false,
      targetMarker: { shape: 'open' },
      dashPattern: [6, 4],
    });
    expect(canonical).not.toHaveProperty('sourceEntityId');
    expect(canonical).not.toHaveProperty('targetEntityId');
  });

  it('保留完整的 Core NodeTargets 以供以后的 Core 解析结果使用', () => {
    const source = { id: 'node', anchor: { side: 'right', fraction: 0.25 }, offset: [2, -3], boundary: 'shape' };
    const target = { id: 'scope', anchor: 'west' };
    const canonical = Graph.resolveRelation(relation({ source, target }), Graph.resolveGraphDefinitionOptions());

    expect(canonical.source.source).toEqual(source);
    expect(canonical.source.target).toEqual(target);
  });

  it('拒绝所选角色和种类子集之外的显式方向', () => {
    expect(() =>
      Graph.resolveRelation(
        relation({ id: 'invalid-direction', role: 'dependency', direction: 'reverse' }),
        Graph.resolveGraphDefinitionOptions(),
      ),
    ).toThrow(/invalid-direction.*reverse.*not allowed/i);
  });

  it.each([
    'uml.association',
    'uml.aggregation',
    'uml.composition',
    'uml.generalization',
    'uml.dependency',
    'uml.realization',
  ])('拒绝未注册的类型 %s，而不回退到角色', kind => {
    expect(() => Graph.resolveRelation(relation({ kind }), Graph.resolveGraphDefinitionOptions())).toThrow(
      /not registered/i,
    );
  });

  it('拒绝在另一个角色或扩展方向下注册的类型', () => {
    const context = Graph.resolveGraphDefinitionOptions({ relationKinds: [realization] });

    expect(() => Graph.resolveRelation(relation({ role: 'generalization', kind: realization.kind }), context)).toThrow(
      /uml\.realization.*dependency.*generalization/i,
    );
    expect(() =>
      Graph.resolveRelation(relation({ role: 'dependency', kind: realization.kind, direction: 'reverse' }), context),
    ).toThrow(/reverse.*not allowed/i);
    expect(() => Graph.resolveGraphDefinitionOptions({ relationKinds: [realization, realization] })).toThrow(
      /already registered/i,
    );
  });
});
