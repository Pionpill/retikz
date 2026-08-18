import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

type PublicGraphSchema = ZodType<{
  namespace: 'graph';
  type: 'graph';
  id?: string;
  entityVariant?: string;
  graphThemeTokens?: Readonly<Record<string, unknown>>;
  graphThemeTokenRules?: ReadonlyArray<unknown>;
  children: ReadonlyArray<unknown>;
}>;

type PublicRuleSchema = ZodType<ReadonlyArray<unknown>>;

const publicExport = <T>(name: string): T => {
  const value = (Graph as Record<string, unknown>)[name];
  expect(value, `missing public export ${name}`).toBeDefined();
  return value as T;
};

const graphInput = {
  namespace: 'graph',
  type: 'graph',
  id: 'workflow',
  entityVariant: 'muted',
  graphThemeTokens: {
    'graph.entity.color': '#336699',
    'graph.entity.strokeWidth': 2,
  },
  graphThemeTokenRules: [
    {
      select: { role: 'service', variant: ['mixed', 'muted'] },
      tokens: { 'graph.entity.fill': 'none' },
    },
  ],
  children: [{ type: 'node', id: 'child', position: [0, 0] }],
} as const;

describe('Graph Source IR schema', () => {
  it('round-trips a strict JSON-safe Graph presentation root', () => {
    const schema = publicExport<PublicGraphSchema>('GraphSchema');
    const parsed = schema.parse(graphInput);

    expect(JSON.parse(JSON.stringify(parsed))).toEqual(graphInput);
    expect(() => schema.parse({ ...graphInput, registry: {} })).toThrow();
  });

  it('accepts open nonblank Entity and scope variant keys', () => {
    const entitySchema = publicExport<ZodType>('EntitySchema');
    const containerSchema = publicExport<ZodType>('ContainerSchema');
    const graphSchema = publicExport<PublicGraphSchema>('GraphSchema');

    expect(
      entitySchema.parse({
        namespace: 'graph',
        type: 'entity',
        id: 'service',
        role: 'service',
        variant: 'muted',
        position: [0, 0],
      }),
    ).toMatchObject({ role: 'service', variant: 'muted' });
    expect(
      containerSchema.parse({
        namespace: 'graph',
        type: 'container',
        id: 'group',
        entityVariant: 'muted',
        header: { child: { type: 'node', position: [0, 0] } },
      }),
    ).toMatchObject({ entityVariant: 'muted' });
    expect(graphSchema.parse({ ...graphInput, entityVariant: 'muted' })).toMatchObject({ entityVariant: 'muted' });

    expect(() =>
      entitySchema.parse({ namespace: 'graph', type: 'entity', id: 'empty', role: ' ', position: [0, 0] }),
    ).toThrow();
    expect(() => graphSchema.parse({ ...graphInput, entityVariant: '' })).toThrow();
  });
});

describe('Graph Entity theme selector schema', () => {
  it('accepts role, variant, and role-plus-variant selectors without reordering authored arrays', () => {
    const schema = publicExport<PublicRuleSchema>('GraphEntityThemeTokenRulesSchema');
    const rules = [
      { select: { role: 'service' }, tokens: { 'graph.entity.strokeWidth': 2 } },
      { select: { variant: ['muted', 'mixed'] }, tokens: { 'graph.entity.opacity': 0.8 } },
      {
        select: { role: ['service', 'database'], variant: 'mixed' },
        tokens: { 'graph.entity.fill': 'none' },
      },
    ];

    expect(schema.parse(rules)).toEqual(rules);
  });

  it.each([
    [{ select: {}, tokens: { 'graph.entity.fill': 'none' } }],
    [{ select: { role: [] }, tokens: { 'graph.entity.fill': 'none' } }],
    [{ select: { variant: ['mixed', 'mixed'] }, tokens: { 'graph.entity.fill': 'none' } }],
    [{ select: { role: 'service', unknown: true }, tokens: { 'graph.entity.fill': 'none' } }],
    [{ select: { role: 'service' }, tokens: { 'graph.entity.unknown': 'none' } }],
  ])('rejects an invalid selector or token map: %j', rules => {
    const schema = publicExport<PublicRuleSchema>('GraphEntityThemeTokenRulesSchema');

    expect(() => schema.parse(rules)).toThrow();
  });
});
