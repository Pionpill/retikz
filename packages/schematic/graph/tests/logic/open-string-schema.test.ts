import type { core as ZodCore, ZodType } from 'zod';

import { describe, expect, it } from 'vitest';
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

describe('Graph registry-backed open string schemas', () => {
  it('accepts built-in and custom keys while rejecting blank values', () => {
    expect(
      Graph.EntitySchema.parse({
        namespace: 'graph',
        type: 'entity',
        role: Graph.EntityRole.Participant,
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
        kind: Graph.RelationKind.UmlAggregation,
      }),
    ).toMatchObject({
      role: 'custom.relation-role',
      kind: 'uml.aggregation',
    });
    expect(() => Graph.EntitySchema.parse({ namespace: 'graph', type: 'entity', role: '   ' })).toThrow();
  });

  it('exposes built-in values without closing Entity and Relation extension keys', () => {
    expectOpenStringSchema(Graph.EntityRoleSchema, Object.values(Graph.EntityRole));
    expectOpenStringSchema(Graph.RelationRoleSchema, Object.values(Graph.RelationRole));
    expectOpenStringSchema(Graph.RelationKindSchema, Object.values(Graph.RelationKind));
  });

  it('uses the same hinted schemas in semantic Theme selectors without visual keys', () => {
    const graphSchema = toJSONSchema(Graph.GraphSchema) as {
      properties?: Record<string, ZodCore.JSONSchema.BaseSchema>;
    };
    expect(graphSchema.properties).not.toHaveProperty('entityVariant');

    expect(
      Graph.GraphEntityThemeSelectorSchema.parse({
        role: [Graph.EntityRole.Activity, 'custom.entity-role'],
        kind: 'custom.entity-kind',
      }),
    ).toEqual({
      role: ['activity', 'custom.entity-role'],
      kind: 'custom.entity-kind',
    });
    expect(
      Graph.GraphRelationThemeSelectorSchema.parse({
        role: Graph.RelationRole.Dependency,
        kind: ['custom.relation-kind'],
        direction: 'forward',
      }),
    ).toEqual({ role: 'dependency', kind: ['custom.relation-kind'], direction: 'forward' });
    expect(() => Graph.GraphEntityThemeSelectorSchema.parse({ variant: 'fill' })).toThrow();
    expect(() => Graph.GraphRelationThemeSelectorSchema.parse({ variant: 'default' })).toThrow();
    expect(() =>
      Graph.GraphEntityThemeSelectorSchema.parse({ role: [Graph.EntityRole.Activity, Graph.EntityRole.Activity] }),
    ).toThrow(/Duplicate/);
  });

  it('keeps unregistered custom values as resolver errors instead of schema errors', () => {
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
