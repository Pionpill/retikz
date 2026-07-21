import type { CompositeDefinition } from '@retikz/core';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { LowerTablesOptions, TableStructureOutput } from '../../../src';

import {
  createTableRuntimeContribution,
  defineCellPresentation,
  defineTableStructure,
  makeTableRuntimeComposites,
  TABLE_NAMESPACE,
  TableComposite,
  TableRowKind,
} from '../../../src';

const outputOf = (kind: string): TableStructureOutput => ({
  rows: [{ id: 'row.0', kind: TableRowKind.Body }],
  columns: [{ id: 'column.0' }],
  cells: [
    {
      id: 'cell.0',
      row: 0,
      column: 0,
      payload: { kind: 'value', value: kind },
      location: 'body',
      roles: ['data'],
      source: { kind: 'generated', structureKind: kind },
    },
  ],
});

const structureOf = (kind: string) =>
  defineTableStructure({
    schema: z.strictObject({ kind: z.literal(kind) }),
    build: () => outputOf(kind),
  });

const presentationOf = (name: string) =>
  defineCellPresentation({
    name,
    optionsSchema: z.strictObject({}),
    present: input => ({ type: 'node', position: [0, 0], text: String(input.value) }),
  });

const compositeOf = (namespace: string, type: string): CompositeDefinition => {
  const schema = CompositeBaseSchema.extend({ namespace: z.literal(namespace), type: z.literal(type) });
  return defineComposite({
    namespace,
    type,
    schema,
    expand: () => ({ type: 'scope', children: [] }),
  });
};

const mergeContributions = (...contributions: Array<ReturnType<typeof createTableRuntimeContribution>>) =>
  Object.assign({}, ...contributions.map(contribution => contribution.datasets));

describe('Table runtime contribution', () => {
  it('uses a stable maker reference and an encoded runtime reference while preserving dataset identities', () => {
    const rows: Array<Record<string, unknown>> = [{ value: 1 }];
    const contribution = createTableRuntimeContribution({
      reference: 'panel/a b',
      data: { sales: rows },
    });
    const another = createTableRuntimeContribution({ reference: 'panel/b' });

    expect(contribution.makeComposites).toBe(makeTableRuntimeComposites);
    expect(another.makeComposites).toBe(makeTableRuntimeComposites);
    expect(contribution.datasets.sales).toBe(rows);
    expect(Object.keys(contribution.datasets)).toEqual(['sales', '@@retikz/table/runtime/panel%2Fa%20b']);
  });

  it('rejects empty references and collisions with the reserved runtime dataset key', () => {
    expect(() => createTableRuntimeContribution({ reference: '  ' })).toThrow(/reference.*non-empty/i);
    expect(() =>
      createTableRuntimeContribution({
        reference: 'panel',
        data: { '@@retikz/table/runtime/panel': [] },
      }),
    ).toThrow(/dataset.*conflict/i);
  });

  it('strips runtime envelopes, lowers clean datasets, and orders Table definitions before extras', () => {
    const extra = compositeOf('fixture', 'badge');
    const rows = [{ name: 'Ada' }];
    const contribution = createTableRuntimeContribution({
      reference: 'people-table',
      data: { people: rows },
      composites: [extra],
    });
    const definitions = contribution.makeComposites(contribution.datasets);

    expect(definitions.map(definition => `${definition.namespace}.${definition.type}`)).toEqual([
      `${TABLE_NAMESPACE}.${TableComposite.Table}`,
      'fixture.badge',
    ]);
    const table = definitions[0];
    const node = table.expand({
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      data: { reference: 'people' },
      structure: { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
    });
    expect(JSON.stringify(node)).toContain('Ada');
  });

  it('merges definitions and composites in first-contribution order and deduplicates the same objects', () => {
    const structureA = structureOf('fixture-a');
    const structureB = structureOf('fixture-b');
    const presentationA = presentationOf('fixture-a');
    const presentationB = presentationOf('fixture-b');
    const compositeA = compositeOf('fixture', 'a');
    const compositeB = compositeOf('fixture', 'b');
    const first = createTableRuntimeContribution({
      reference: 'first',
      lowerOptions: {
        structureDefinitions: [structureA],
        presentationDefinitions: [presentationA],
      },
      composites: [compositeA],
    });
    const second = createTableRuntimeContribution({
      reference: 'second',
      lowerOptions: {
        structureDefinitions: [structureA, structureB],
        presentationDefinitions: [presentationA, presentationB],
      },
      composites: [compositeA, compositeB],
    });

    expect(() => makeTableRuntimeComposites(mergeContributions(first, second))).not.toThrow();
    expect(makeTableRuntimeComposites(mergeContributions(first, second)).slice(1)).toEqual([compositeA, compositeB]);
  });

  it.each([
    ['structure', { structureDefinitions: [structureOf('same')] }, { structureDefinitions: [structureOf('same')] }],
    [
      'presentation',
      { presentationDefinitions: [presentationOf('same')] },
      { presentationDefinitions: [presentationOf('same')] },
    ],
  ] as const)(
    'fails loud for the same %s key with different definition objects',
    (_label, firstOptions, secondOptions) => {
      const first = createTableRuntimeContribution({ reference: 'first', lowerOptions: firstOptions });
      const second = createTableRuntimeContribution({ reference: 'second', lowerOptions: secondOptions });

      expect(() => makeTableRuntimeComposites(mergeContributions(first, second))).toThrow(/conflict/i);
    },
  );

  it('fails loud for the same composite key with different objects', () => {
    const first = createTableRuntimeContribution({
      reference: 'first',
      composites: [compositeOf('fixture', 'same')],
    });
    const second = createTableRuntimeContribution({
      reference: 'second',
      composites: [compositeOf('fixture', 'same')],
    });

    expect(() => makeTableRuntimeComposites(mergeContributions(first, second))).toThrow(/composite.*conflict/i);
  });

  it('requires future non-definition lower options to share the same object identity', () => {
    const shared = {};
    const optionsOf = (futureMode: object) => ({ futureMode }) as LowerTablesOptions & { futureMode: object };
    const first = createTableRuntimeContribution({ reference: 'first', lowerOptions: optionsOf(shared) });
    const second = createTableRuntimeContribution({ reference: 'second', lowerOptions: optionsOf(shared) });
    const conflict = createTableRuntimeContribution({ reference: 'conflict', lowerOptions: optionsOf({}) });

    expect(() => makeTableRuntimeComposites(mergeContributions(first, second))).not.toThrow();
    expect(() => makeTableRuntimeComposites(mergeContributions(first, conflict))).toThrow(/lower option.*futureMode/i);
  });
});
