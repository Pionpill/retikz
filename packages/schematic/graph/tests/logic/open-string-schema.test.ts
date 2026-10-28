import { describe, expect, it } from 'vitest';
import type { core as ZodCore, ZodType } from 'zod';
import { toJSONSchema } from 'zod';

import * as Graph from '../../src';

const expectOpenStringSchema = (schema: ZodType, values: ReadonlyArray<string>): void => {
  expect(toJSONSchema(schema)).toMatchObject({
    anyOf: [
      { type: 'string', enum: values },
      { type: 'string', minLength: 1 },
    ],
  });
};

describe('Graph 注册表支持的开放字符串 schema', () => {
  it('接受内置和自定义键，同时拒绝空白值', () => {
    expect(
      Graph.EntitySchema.parse({
        namespace: 'graph',
        type: 'entity',
        role: Graph.BuiltinEntityRole.Participant,
        kind: 'custom.entity-kind',
        predicate: { name: 'custom.entity-predicate' },
      }),
    ).toMatchObject({
      role: 'participant',
      kind: 'custom.entity-kind',
      predicate: { name: 'custom.entity-predicate' },
    });
    expect(
      Graph.RelationSchema.parse({
        namespace: 'graph',
        type: 'relation',
        source: { id: 'source' },
        target: { id: 'target' },
        role: 'custom.relation-role',
        kind: 'custom.relation-kind',
      }),
    ).toMatchObject({
      role: 'custom.relation-role',
      kind: 'custom.relation-kind',
    });
    expect(() => Graph.EntitySchema.parse({ namespace: 'graph', type: 'entity', role: '   ' })).toThrow();
  });

  it('公开内置值而不关闭 Entity 和 Relation 扩展键', () => {
    expectOpenStringSchema(Graph.EntityRoleSchema, Object.values(Graph.BuiltinEntityRole));
    expectOpenStringSchema(Graph.RelationRoleSchema, Object.values(Graph.BuiltinRelationRole));

    expect(toJSONSchema(Graph.RelationKindSchema)).toMatchObject({ type: 'string' });
    expect(toJSONSchema(Graph.RelationKindSchema)).not.toHaveProperty('anyOf');
    expect(toJSONSchema(Graph.RelationKindSchema)).not.toHaveProperty('enum');

    for (const kind of ['', '   ']) expect(Graph.RelationKindSchema.safeParse(kind).success).toBe(false);

    expect(Graph.RelationKindSchema.parse(JSON.parse(JSON.stringify('custom.relation-kind')))).toBe(
      'custom.relation-kind',
    );
  });

  it('在语义主题选择器中使用相同的暗示 schema，无需视觉键', () => {
    const graphSchema = toJSONSchema(Graph.GraphSchema) as {
      properties?: Record<string, ZodCore.JSONSchema.BaseSchema>;
    };

    expect(graphSchema.properties).not.toHaveProperty('entityVariant');

    expect(
      Graph.GraphEntityThemeSelectorSchema.parse({
        role: [Graph.BuiltinEntityRole.Activity, 'custom.entity-role'],
        kind: 'custom.entity-kind',
      }),
    ).toEqual({
      role: ['activity', 'custom.entity-role'],
      kind: 'custom.entity-kind',
    });
    expect(
      Graph.GraphRelationThemeSelectorSchema.parse({
        role: Graph.BuiltinRelationRole.Dependency,
        kind: ['custom.relation-kind'],
        direction: 'forward',
      }),
    ).toEqual({ role: 'dependency', kind: ['custom.relation-kind'], direction: 'forward' });
    expect(() => Graph.GraphEntityThemeSelectorSchema.parse({ variant: 'fill' })).toThrow();
    expect(() => Graph.GraphRelationThemeSelectorSchema.parse({ variant: 'default' })).toThrow();
    expect(() =>
      Graph.GraphEntityThemeSelectorSchema.parse({
        role: [Graph.BuiltinEntityRole.Activity, Graph.BuiltinEntityRole.Activity],
      }),
    ).toThrow(/Duplicate/);
  });

  it('将未注册的自定义值保留为解析器错误而不是 schema 错误', () => {
    const source = Graph.EntitySchema.parse({
      namespace: 'graph',
      type: 'entity',
      id: 'custom',
      role: 'custom.unregistered-role',
    });

    expect(() => Graph.resolveEntity(source, Graph.resolveGraphDefinitionOptions())).toThrow(/not registered/i);

    const relation = Graph.RelationSchema.parse({
      namespace: 'graph',
      type: 'relation',
      source: { id: 'source' },
      target: { id: 'target' },
      role: 'custom.unregistered-role',
    });

    expect(() => Graph.resolveRelation(relation, Graph.resolveGraphDefinitionOptions())).toThrow(/not registered/i);
  });
});
