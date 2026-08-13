import type { AnyCompositeDefinition } from '@retikz/core';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineThemeStyle,
  resolveCompositeDependencies,
  resolveDefaultCoreThemeColors,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { LowerTablesOptions, TableStructureOutput } from '../../../src';

import {
  createTableRuntimeContribution,
  defineCellFormatter,
  defineCellPresentation,
  defineCellVisualScale,
  defineTableStructure,
  defineTableThemeStyle,
  getDefaultTableThemePreset,
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

const formatterOf = (name: string) =>
  defineCellFormatter({
    name,
    optionsSchema: z.strictObject({}),
    format: input => input.value,
  });

const visualScaleOf = (name: string) =>
  defineCellVisualScale({
    name,
    optionsSchema: z.strictObject({}),
    resolve: () => ({ of: () => '#2563eb', legendForm: 'swatch', domain: [1], range: ['#2563eb'] }),
  });

const themeStyleOf = (name: string) =>
  defineTableThemeStyle({
    name,
    resolve: theme => getDefaultTableThemePreset(theme.mode),
  });

const compositeOf = (namespace: string, type: string): AnyCompositeDefinition => {
  const schema = CompositeBaseSchema.extend({ namespace: z.literal(namespace), type: z.literal(type) });
  return defineComposite({
    namespace,
    type,
    schema,
    expand: () => ({ children: [{ type: 'scope', children: [] }] }),
  });
};

const definitionsOf = (...contributions: Array<ReturnType<typeof createTableRuntimeContribution>>) =>
  resolveCompositeDependencies({ contributions });

const tableProviderOf = (contribution: ReturnType<typeof createTableRuntimeContribution>) =>
  contribution.providers.find(provider => provider.key.namespace === TABLE_NAMESPACE && provider.key.type === 'table');

describe('Table runtime contribution', () => {
  it('uses a stable maker reference and an encoded runtime reference while preserving dataset identities', () => {
    const rows: Array<Record<string, unknown>> = [{ value: 1 }];
    const contribution = createTableRuntimeContribution({
      reference: 'panel/a b',
      data: { sales: rows },
    });
    const another = createTableRuntimeContribution({ reference: 'panel/b' });

    const provider = tableProviderOf(contribution);
    const anotherProvider = tableProviderOf(another);
    expect(provider?.makeDefinition).toBe(anotherProvider?.makeDefinition);
    expect(contribution.roots).toEqual([{ namespace: TABLE_NAMESPACE, type: TableComposite.Table }]);
    expect(provider?.dependencies).toEqual([]);
    expect(provider?.datasets.sales).toBe(rows);
    expect(Object.keys(provider?.datasets ?? {})).toEqual(['sales', '@@retikz/table/runtime/panel%2Fa%20b']);
  });

  it.each(['', '  ', '\u2003', '\ufeff'])('rejects blank references with the Table prefix (%j)', reference => {
    expect(() => createTableRuntimeContribution({ reference })).toThrowError(
      'table: runtime contribution reference must be non-empty',
    );
  });

  it('rejects collisions with the reserved runtime dataset key', () => {
    expect(() =>
      createTableRuntimeContribution({
        reference: 'panel',
        data: { '@@retikz/table/runtime/panel': [] },
      }),
    ).toThrow(/dataset.*conflict/i);
  });

  it('encodes lone surrogate references without collapsing JSON string identities', () => {
    const highSurrogate = String.fromCharCode(0xd800);
    const replacementCharacter = '\ufffd';
    const highContribution = createTableRuntimeContribution({ reference: highSurrogate });
    const replacementContribution = createTableRuntimeContribution({ reference: replacementCharacter });
    const highReference = Object.keys(tableProviderOf(highContribution)?.datasets ?? {})[0];
    const replacementReference = Object.keys(tableProviderOf(replacementContribution)?.datasets ?? {})[0];

    expect(highReference).toBe('@@retikz/table/runtime/%uD800');
    expect(replacementReference).toBe('@@retikz/table/runtime/%EF%BF%BD');
    expect(highReference).not.toBe(replacementReference);
  });

  it('strips runtime envelopes, lowers clean datasets, and orders Table definitions before extras', () => {
    const extra = compositeOf('fixture', 'badge');
    const rows = [{ name: 'Ada' }];
    const contribution = createTableRuntimeContribution({
      reference: 'people-table',
      data: { people: rows },
      composites: [extra],
    });
    const definitions = definitionsOf(contribution);

    expect(definitions.map(definition => `${definition.namespace}.${definition.type}`)).toEqual([
      `${TABLE_NAMESPACE}.${TableComposite.Table}`,
      'fixture.badge',
    ]);
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            namespace: TABLE_NAMESPACE,
            type: TableComposite.Table,
            data: { reference: 'people' },
            structure: {
              kind: 'detail',
              header: false,
              columns: [{ id: 'name', field: 'name' }],
            },
          },
        ],
      },
      { composites: definitions },
    );
    expect(JSON.stringify(result.scene)).toContain('Ada');
  });

  it('carries a custom Table style definition through the embedded runtime envelope', () => {
    const tableStyle = themeStyleOf('brand');
    const contribution = createTableRuntimeContribution({
      reference: 'brand-table',
      lowerOptions: { tableThemeStyles: [tableStyle] },
    });
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        theme: { style: 'brand', mode: 'light' },
        children: [
          {
            namespace: TABLE_NAMESPACE,
            type: TableComposite.Table,
            structure: { kind: 'manual', rows: [['x']] },
          },
        ],
      },
      {
        composites: definitionsOf(contribution),
        themeStyles: [
          defineThemeStyle({
            name: 'brand',
            resolve: ({ mode }) => resolveDefaultCoreThemeColors(mode),
          }),
        ],
      },
    );
    const manifest = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === TABLE_NAMESPACE,
    );

    expect(manifest?.kind === 'composite' ? manifest.value : undefined).toMatchObject({
      style: { style: 'brand', themeMode: 'light' },
    });
  });

  it('merges definitions and composites in first-contribution order and deduplicates the same objects', () => {
    const structureA = structureOf('fixture-a');
    const structureB = structureOf('fixture-b');
    const presentationA = presentationOf('fixture-a');
    const presentationB = presentationOf('fixture-b');
    const formatterA = formatterOf('fixture-a');
    const formatterB = formatterOf('fixture-b');
    const visualScaleA = visualScaleOf('fixture-a');
    const visualScaleB = visualScaleOf('fixture-b');
    const themeStyleA = themeStyleOf('fixture-a');
    const themeStyleB = themeStyleOf('fixture-b');
    const compositeA = compositeOf('fixture', 'a');
    const compositeB = compositeOf('fixture', 'b');
    const first = createTableRuntimeContribution({
      reference: 'first',
      lowerOptions: {
        structureDefinitions: [structureA],
        formatterDefinitions: [formatterA],
        presentationDefinitions: [presentationA],
        visualScaleDefinitions: [visualScaleA],
        tableThemeStyles: [themeStyleA],
      },
      composites: [compositeA],
    });
    const second = createTableRuntimeContribution({
      reference: 'second',
      lowerOptions: {
        structureDefinitions: [structureA, structureB],
        formatterDefinitions: [formatterA, formatterB],
        presentationDefinitions: [presentationA, presentationB],
        visualScaleDefinitions: [visualScaleA, visualScaleB],
        tableThemeStyles: [themeStyleA, themeStyleB],
      },
      composites: [compositeA, compositeB],
    });

    expect(() => definitionsOf(first, second)).not.toThrow();
    expect(definitionsOf(first, second).slice(1)).toEqual([compositeA, compositeB]);
  });

  it.each([
    ['structure', { structureDefinitions: [structureOf('same')] }, { structureDefinitions: [structureOf('same')] }],
    ['formatter', { formatterDefinitions: [formatterOf('same')] }, { formatterDefinitions: [formatterOf('same')] }],
    [
      'presentation',
      { presentationDefinitions: [presentationOf('same')] },
      { presentationDefinitions: [presentationOf('same')] },
    ],
    [
      'visual scale',
      { visualScaleDefinitions: [visualScaleOf('same')] },
      { visualScaleDefinitions: [visualScaleOf('same')] },
    ],
    ['theme style', { tableThemeStyles: [themeStyleOf('same')] }, { tableThemeStyles: [themeStyleOf('same')] }],
  ] as const)(
    'fails loud for the same %s key with different definition objects',
    (_label, firstOptions, secondOptions) => {
      const first = createTableRuntimeContribution({ reference: 'first', lowerOptions: firstOptions });
      const second = createTableRuntimeContribution({ reference: 'second', lowerOptions: secondOptions });

      expect(() => definitionsOf(first, second)).toThrow(/conflict/i);
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

    expect(() => definitionsOf(first, second)).toThrow(/dataset.*conflict.*identity/i);
  });

  it('requires future non-definition lower options to share the same object identity', () => {
    const shared = {};
    const optionsOf = (futureMode: object) => ({ futureMode }) as LowerTablesOptions & { futureMode: object };
    const first = createTableRuntimeContribution({ reference: 'first', lowerOptions: optionsOf(shared) });
    const second = createTableRuntimeContribution({ reference: 'second', lowerOptions: optionsOf(shared) });
    const conflict = createTableRuntimeContribution({ reference: 'conflict', lowerOptions: optionsOf({}) });

    expect(() => definitionsOf(first, second)).not.toThrow();
    expect(() => definitionsOf(first, conflict)).toThrow(/lower option.*futureMode/i);
  });

  it('defensively copies formatter definition arrays when creating a contribution', () => {
    const original = formatterOf('original');
    const late = formatterOf('late');
    const formatterDefinitions = [original];
    const first = createTableRuntimeContribution({ reference: 'first', lowerOptions: { formatterDefinitions } });
    formatterDefinitions.push(late);
    const second = createTableRuntimeContribution({
      reference: 'second',
      lowerOptions: { formatterDefinitions: [formatterOf('late')] },
    });

    expect(() => definitionsOf(first, second)).not.toThrow();
  });

  it('defensively copies visual scale definition arrays when creating a contribution', () => {
    const original = visualScaleOf('original');
    const late = visualScaleOf('late');
    const visualScaleDefinitions = [original];
    const first = createTableRuntimeContribution({ reference: 'first', lowerOptions: { visualScaleDefinitions } });
    visualScaleDefinitions.push(late);
    const second = createTableRuntimeContribution({
      reference: 'second',
      lowerOptions: { visualScaleDefinitions: [visualScaleOf('late')] },
    });

    expect(() => definitionsOf(first, second)).not.toThrow();
  });

  it('freezes copied runtime containers without cloning or freezing caller definitions', () => {
    const structure = structureOf('original-structure');
    const formatter = formatterOf('original-formatter');
    const presentation = presentationOf('original-presentation');
    const visualScale = visualScaleOf('original-scale');
    const themeStyle = themeStyleOf('original-style');
    const composite = compositeOf('fixture', 'original');
    const structureDefinitions = [structure];
    const formatterDefinitions = [formatter];
    const presentationDefinitions = [presentation];
    const visualScaleDefinitions = [visualScale];
    const tableThemeStyles = [themeStyle];
    const composites = [composite];
    const originalFrozenStates = [structure, formatter, presentation, visualScale, themeStyle, composite].map(value =>
      Object.isFrozen(value),
    );

    const contribution = createTableRuntimeContribution({
      reference: 'frozen',
      lowerOptions: {
        structureDefinitions,
        formatterDefinitions,
        presentationDefinitions,
        visualScaleDefinitions,
        tableThemeStyles,
      },
      composites,
    });
    const envelope = tableProviderOf(contribution)?.datasets['@@retikz/table/runtime/frozen'] as Readonly<{
      lowerOptions: LowerTablesOptions;
    }>;

    structureDefinitions.push(structureOf('late-structure'));
    formatterDefinitions.push(formatterOf('late-formatter'));
    presentationDefinitions.push(presentationOf('late-presentation'));
    visualScaleDefinitions.push(visualScaleOf('late-scale'));
    tableThemeStyles.push(themeStyleOf('late-style'));
    composites.push(compositeOf('fixture', 'late'));

    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.lowerOptions)).toBe(true);
    expect(Object.isFrozen(envelope.lowerOptions.structureDefinitions)).toBe(true);
    expect(Object.isFrozen(envelope.lowerOptions.formatterDefinitions)).toBe(true);
    expect(Object.isFrozen(envelope.lowerOptions.presentationDefinitions)).toBe(true);
    expect(Object.isFrozen(envelope.lowerOptions.visualScaleDefinitions)).toBe(true);
    expect(Object.isFrozen(envelope.lowerOptions.tableThemeStyles)).toBe(true);
    expect(envelope.lowerOptions.structureDefinitions).toEqual([structure]);
    expect(envelope.lowerOptions.formatterDefinitions).toEqual([formatter]);
    expect(envelope.lowerOptions.presentationDefinitions).toEqual([presentation]);
    expect(envelope.lowerOptions.visualScaleDefinitions).toEqual([visualScale]);
    expect(envelope.lowerOptions.tableThemeStyles).toEqual([themeStyle]);
    expect(envelope.lowerOptions.structureDefinitions?.[0]).toBe(structure);
    expect(envelope.lowerOptions.formatterDefinitions?.[0]).toBe(formatter);
    expect(envelope.lowerOptions.presentationDefinitions?.[0]).toBe(presentation);
    expect(envelope.lowerOptions.visualScaleDefinitions?.[0]).toBe(visualScale);
    expect(envelope.lowerOptions.tableThemeStyles?.[0]).toBe(themeStyle);
    expect(definitionsOf(contribution).slice(1)).toEqual([composite]);
    expect(
      [structure, formatter, presentation, visualScale, themeStyle, composite].map(value => Object.isFrozen(value)),
    ).toEqual(originalFrozenStates);
  });
});
