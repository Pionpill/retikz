import type { CellPresentationInput } from '@retikz/table';

import { CompositeBaseSchema, defineComposite, defineThemeStyle } from '@retikz/core';
import {
  defineCellFormatter,
  defineCellPresentation,
  defineCellVisualScale,
  defineTableThemeStyle,
  getDefaultTableThemePreset,
} from '@retikz/table';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { detailTable, manualTable, renderTable } from '../../src';

const cleanCoreTheme = defineThemeStyle({
  name: 'clean',
  resolve: () => ({
    semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00' },
    categorical: ['#112233'],
  }),
});

const cleanTableTheme = defineTableThemeStyle({
  name: 'clean',
  resolve: theme => ({
    ...getDefaultTableThemePreset(theme.mode),
    'cell.background.fill': null,
    'cell.content.color': null,
    'cell.content.font.family': null,
    'cell.content.font.weight': null,
    'columnHeader.background.fill': null,
    'columnHeader.content.color': null,
    'columnHeader.content.font.family': null,
    'columnHeader.content.font.weight': null,
    'table.border.horizontal': null,
    'columnHeader.border.bottom': null,
  }),
});

describe('renderTable', () => {
  it('renders anonymous manual specs without data and detail specs with runtime data in SSR', () => {
    const manual = manualTable({
      rows: [['Ada']],
    });
    const detail = detailTable({
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name' }],
    });

    expect(typeof window).toBe('undefined');
    expect(renderTable(manual)).toContain('Ada');
    expect(renderTable(manual, { artifacts: true }).manifest.cells[0].source).toEqual({
      kind: 'manual',
      row: 0,
      column: 0,
    });
    expect(renderTable(detail, { data: { people: [{ name: 'Grace' }] } })).toContain('Grace');
  });

  it('returns manifest artifacts only when requested and keeps output size outside Table geometry', () => {
    const spec = manualTable({
      rows: [
        [null, null],
        [null, null],
      ],
    });
    const plain = renderTable(spec, { output: { width: 640, height: 480 } });
    const artifact = renderTable(spec, { artifacts: true, output: { width: 320, height: 240 } });

    expect(typeof plain).toBe('string');
    expect(plain).toContain('width="640"');
    expect(plain).toContain('height="480"');
    expect(artifact.svg).toContain('width="320"');
    expect(artifact.svg).toContain('height="240"');
    expect(artifact.manifest.allocationBounds).toEqual({ x: 0, y: 0, width: 240, height: 64 });
  });

  it('passes formatter definitions through the shared lowering options in SSR', () => {
    const prefix = defineCellFormatter({
      name: 'prefix',
      optionsSchema: z.strictObject({ prefix: z.string() }),
      format: ({ value }, options) => `${options.prefix}${String(value)}`,
    });
    const spec = manualTable({
      rows: [[{ value: 7, formatter: { name: 'prefix', options: { prefix: '#' } } }]],
    });

    expect(renderTable(spec, { lowerOptions: { formatterDefinitions: [prefix] } })).toContain('#7');
  });

  it('keeps Core Theme, Table tokens, encodings, and custom visual scales in Vanilla SSR artifacts', () => {
    const visualScale = defineCellVisualScale({
      name: 'vanilla-palette',
      optionsSchema: z.strictObject({}),
      resolve: (_options, _values, context) => ({
        of: () => context.categoricalColors[0],
        legendForm: 'swatch',
        domain: [1],
        range: [context.categoricalColors[0]],
      }),
    });
    const spec = manualTable({
      id: 'table',
      rows: [[1]],
      tableThemeTokens: { 'data.categorical': ['#123456'] },
      encodings: [
        {
          id: 'palette',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'vanilla-palette' },
          legend: { title: 'Palette' },
        },
      ],
    });
    const result = renderTable(spec, {
      artifacts: true,
      theme: { style: 'clean', mode: 'dark' },
      compile: { themeStyles: [cleanCoreTheme] },
      lowerOptions: { tableThemeStyles: [cleanTableTheme], visualScaleDefinitions: [visualScale] },
    });

    expect(result.svg).toContain('#123456');
    expect(result.manifest).toMatchObject({
      style: { style: 'clean', themeMode: 'dark' },
      encodings: [{ id: 'palette', scaleName: 'vanilla-palette', cellIds: ['cell.r0.c0'] }],
      legendDescriptors: [
        {
          encodingId: 'palette',
          channel: 'backgroundFill',
          scaleName: 'vanilla-palette',
          title: 'Palette',
          form: 'swatch',
          domain: [1],
          range: ['#123456'],
        },
      ],
      cells: [{ appearance: { background: { fill: '#123456' } }, encodingIds: ['palette'] }],
    });
  });

  it('keeps the light baseline distinct from explicit clean in SSR', () => {
    const baseline = renderTable(manualTable({ rows: [['Ada']] }), { artifacts: true });
    const clean = renderTable(manualTable({ rows: [['Ada']] }), {
      artifacts: true,
      theme: { style: 'clean', mode: 'light' },
      compile: { themeStyles: [cleanCoreTheme] },
      lowerOptions: { tableThemeStyles: [cleanTableTheme] },
    });

    expect(baseline.manifest).toMatchObject({
      style: { themeMode: 'light' },
      cells: [{ appearance: { background: { fill: '#ffffff' }, content: { color: '#18181b' } } }],
    });
    expect(clean.manifest).toMatchObject({
      style: { style: 'clean', themeMode: 'light' },
      cells: [{ appearance: {} }],
      borders: [],
    });
  });

  it('surfaces invalid custom Legend resolution diagnostics through Vanilla SSR', () => {
    const invalid = defineCellVisualScale({
      name: 'vanilla-invalid-legend',
      optionsSchema: z.strictObject({}),
      resolve: () =>
        ({
          of: () => 'red',
          legendForm: 'invalid',
          domain: [1],
          range: ['red'],
        }) as never,
    });
    const spec = manualTable({
      id: 'invalid-legend',
      rows: [[1]],
      encodings: [
        {
          id: 'invalid',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'vanilla-invalid-legend' },
          legend: {},
        },
      ],
    });

    expect(() => renderTable(spec, { lowerOptions: { visualScaleDefinitions: [invalid] } })).toThrow(/legendForm/i);
  });

  it('passes the new Presentation ABI and semantic border appearance through SSR', () => {
    const observed: Array<CellPresentationInput> = [];
    const inspect = defineCellPresentation({
      name: 'inspect-appearance',
      optionsSchema: z.strictObject({}),
      present: input => {
        observed.push(input);
        return {
          type: 'node',
          position: [0, 0],
          text: `${input.context.cellId}:${String(input.rawValue)}>${String(input.value)}`,
        };
      },
    });
    const spec = manualTable({
      rows: [
        [
          { id: 'plain', value: 1, presentation: { name: 'inspect-appearance' } },
          {
            id: 'bordered',
            value: 2,
            presentation: { name: 'inspect-appearance' },
            layout: { borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } } },
          },
        ],
      ],
    });
    const result = renderTable(spec, {
      artifacts: true,
      lowerOptions: { presentationDefinitions: [inspect] },
    });

    expect(result.svg).toContain('plain:1&gt;1');
    expect(result.svg).toContain('bordered:2&gt;2');
    expect(observed).toMatchObject([
      {
        rawValue: 1,
        value: 1,
        context: { cellId: 'plain', rowIndex: 0, columnIndex: 0 },
        appearance: {},
      },
      {
        rawValue: 2,
        value: 2,
        context: { cellId: 'bordered', rowIndex: 0, columnIndex: 1 },
        appearance: { borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } } },
      },
    ]);
    expect(result.manifest.borders).toContainEqual(
      expect.objectContaining({ style: expect.objectContaining({ stroke: '#2563eb', width: 2 }) }),
    );
  });

  it('passes ordered root rules through plain authoring into SSR', () => {
    const observed: Array<CellPresentationInput> = [];
    const inspect = defineCellPresentation({
      name: 'rule-inspect',
      optionsSchema: z.strictObject({}),
      present: input => {
        observed.push(input);
        return { type: 'node', position: [0, 0], text: String(input.value) };
      },
    });
    const spec = manualTable({
      rows: [[{ id: 'ruled', value: 2 }]],
      rules: [
        {
          selector: { cellIds: ['ruled'], value: { kind: 'compare', operator: 'gt', value: 1 } },
          formatter: { name: 'number', options: { specifier: '.1f' } },
          presentation: { name: 'rule-inspect' },
          appearance: {
            background: { fill: '#f3f4f6' },
            borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } },
          },
        },
      ],
    });
    const result = renderTable(spec, {
      artifacts: true,
      lowerOptions: { presentationDefinitions: [inspect] },
    });

    expect(result.svg).toContain('2.0');
    expect(observed).toMatchObject([
      {
        rawValue: 2,
        value: '2.0',
        context: { cellId: 'ruled' },
        appearance: {
          background: { fill: '#f3f4f6' },
          borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } },
        },
      },
    ]);
    expect(result.manifest.borders).toContainEqual(
      expect.objectContaining({ style: expect.objectContaining({ stroke: '#2563eb', width: 2 }) }),
    );
  });

  it('preserves shared content rewrite diagnostics in Vanilla SSR', () => {
    const spec = manualTable({
      rows: [[{ id: 'direct', content: { type: 'node', position: [0, 0], text: 'direct' } }]],
      rules: [{ selector: { cellIds: ['direct'] }, formatter: { name: 'identity' } }],
    });

    expect(() => renderTable(spec)).toThrow(/rule 0.*direct.*formatter/i);
  });

  it('accepts Core options under compile and rejects the removed top-level composites field', () => {
    const spec = manualTable({ rows: [[null]] });

    expect(renderTable(spec, { compile: { padding: 0 }, animation: { enabled: false } })).toContain('<svg');
    expect(() => renderTable(spec, { composites: [] } as never)).toThrow(/composites.*compile\.composites/i);
    expect(() => renderTable(spec, { composites: undefined } as never)).toThrow(/composites.*compile\.composites/i);
  });

  it('compiles nested Tier 2 content through compile.composites in the same SSR result', () => {
    const badgeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema: badgeSchema,
      expand: node => ({ children: [{ type: 'node', position: [0, 0], text: node.label }] }),
    });
    const spec = manualTable({
      rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
    });

    expect(renderTable(spec, { compile: { composites: [badge] } })).toContain('Nested');
  });
});
