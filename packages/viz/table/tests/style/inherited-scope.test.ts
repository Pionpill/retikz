import { compileToScene, defineThemeTokenNamespace, resolveCoreThemeColors } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { lowerTables, resolveTableThemeTokens, TableThemeTokenDefinition, TableThemeTokenKeySchema } from '../../src';

const OtherThemeTokenDefinition = defineThemeTokenNamespace({
  namespace: 'other',
  schema: z.strictObject({ accent: z.string() }),
});

describe('Table inherited theme token resolution', () => {
  it('projects shared categorical and merges inherited then local tokens by key', () => {
    const inherited = ['#111111', '#111111'] as const;
    const resolved = resolveTableThemeTokens(
      {
        style: 'academic',
        mode: 'dark',
        tokens: { table: { 'cell.content.color': '#inherited' } },
        colors: {
          semantic: { error: '#e11d48', success: '#16a34a', warning: '#f59e0b' },
          categorical: inherited,
        },
      },
      { 'cell.content.font.weight': 700 },
    );

    expect(resolved.tokens['cell.content.color']).toBe('#inherited');
    expect(resolved.tokens['cell.content.font.weight']).toBe(700);
    expect(resolved.tokens['data.categorical']).toEqual(inherited);
    expect(resolved.tokens['data.categorical']).not.toBe(inherited);
    expect(resolved.sources['cell.content.color']).toMatchObject({
      kind: 'inherited-theme-token',
      path: '$theme/tokens/table/cell.content.color',
    });
    expect(resolved.sources['cell.content.font.weight']).toMatchObject({
      kind: 'local-theme-token',
      path: '$spec/tableThemeTokens/cell.content.font.weight',
    });
    expect(resolved.sources['data.categorical']).toMatchObject({
      kind: 'shared-categorical',
      path: '$theme/colors/categorical',
    });
  });

  it('lets an inherited Core Theme change formal Cell and manifest consumers', () => {
    const spec = {
      namespace: 'table' as const,
      type: 'table' as const,
      id: 'inherited',
      tableThemeTokens: { 'cell.content.color': '#local' },
      structure: { kind: 'manual' as const, rows: [['value'], [null]] },
      encodings: [
        {
          id: 'palette',
          selector: { locations: ['body'] as const },
          channel: 'backgroundFill' as const,
          scale: { name: 'ordinal-color' },
          legend: { title: 'Palette' },
        },
      ],
    };
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            theme: {
              style: 'academic',
              mode: 'dark',
              tokens: {
                table: {
                  'cell.content.font.weight': 700,
                  'data.categorical': ['#inherited-categorical'],
                  'table.border.horizontal': { kind: 'line', stroke: '#inherited-border', width: 2 },
                },
              },
            },
            children: [spec],
          },
        ],
      },
      {
        composites: lowerTables({}),
        themeTokenDefinitions: [TableThemeTokenDefinition],
      },
    );
    const manifest = result.artifacts.find(artifact => artifact.kind === 'composite');
    if (manifest === undefined) throw new Error('expected Table manifest artifact');

    expect(manifest.value.style).toMatchObject({ style: 'academic', themeMode: 'dark' });
    expect(manifest.value.style.tokens['cell.content.color']).toBe('#local');
    expect(manifest.value.style.tokens['cell.content.font.weight']).toBe(700);
    expect(manifest.value.style.tokens['data.categorical']).toEqual(['#inherited-categorical']);
    expect(manifest.value.style.sources.find(entry => entry.key === 'data.categorical')).toEqual({
      key: 'data.categorical',
      source: 'inherited-theme-token',
      path: '$theme/tokens/table/data.categorical',
    });
    expect(manifest.value.cells[0].appearance).toMatchObject({
      background: { fill: '#inherited-categorical' },
    });
    expect(manifest.value.legendDescriptors).toEqual([
      {
        encodingId: 'palette',
        channel: 'backgroundFill',
        scaleName: 'ordinal-color',
        title: 'Palette',
        form: 'swatch',
        domain: ['value'],
        range: ['#inherited-categorical'],
      },
    ]);
    const inheritedBorder = manifest.value.borders.find(edge => edge.style.stroke === '#inherited-border');
    expect(inheritedBorder).toBeDefined();
    expect(inheritedBorder?.atoms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          winner: expect.objectContaining({
            origin: 'styleToken',
            styleToken: {
              key: 'table.border.horizontal',
              source: 'inherited-theme-token',
              path: '$theme/tokens/table/table.border.horizontal',
            },
          }),
        }),
      ]),
    );
    expect(manifest.value.style.sources).toEqual(
      TableThemeTokenKeySchema.options.map(key => expect.objectContaining({ key })),
    );
    expect(manifest.value.cells[0].appearance.content).toMatchObject({
      color: '#local',
      nodeDefault: { font: { weight: 700 } },
    });
    expect(manifest.value.cells[0].appearanceTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/content/color',
          source: expect.objectContaining({ kind: 'styleToken', tokenSource: 'local-theme-token' }),
        }),
        expect.objectContaining({
          path: '/content/nodeDefault/font/weight',
          source: expect.objectContaining({ kind: 'styleToken', tokenSource: 'inherited-theme-token' }),
        }),
      ]),
    );
  });

  it('isolates Table sequential, encoding, and Legend range from another Core Theme namespace', () => {
    const spec = {
      namespace: 'table' as const,
      type: 'table' as const,
      id: 'namespace-isolation',
      structure: { kind: 'manual' as const, rows: [['value'], [null]] },
      encodings: [
        {
          id: 'palette',
          selector: { locations: ['body'] as const },
          channel: 'backgroundFill' as const,
          scale: { name: 'ordinal-color' },
          legend: { title: 'Palette' },
        },
      ],
    };

    const compileWithOtherThemeAccent = (accent: string) => {
      const result = compileToScene(
        {
          version: 1,
          type: 'scene',
          children: [
            {
              type: 'scope',
              theme: { tokens: { other: { accent } } },
              children: [spec],
            },
          ],
        },
        {
          composites: lowerTables({}),
          themeTokenDefinitions: [TableThemeTokenDefinition, OtherThemeTokenDefinition],
        },
      );
      const manifest = result.artifacts.find(artifact => artifact.kind === 'composite');
      if (manifest === undefined) throw new Error('expected Table manifest artifact');
      return manifest.value;
    };

    const first = compileWithOtherThemeAccent('#111111');
    const second = compileWithOtherThemeAccent('#eeeeee');

    expect(second.style.tokens['data.sequential']).toStrictEqual(first.style.tokens['data.sequential']);
    expect(second.encodings).toStrictEqual(first.encodings);
    expect(second.legendDescriptors[0]?.range).toStrictEqual(first.legendDescriptors[0]?.range);
  });

  it('keeps Table sequential colors owned by Table rather than Plot', () => {
    const colors = resolveCoreThemeColors('neutral', 'light');
    const resolved = resolveTableThemeTokens({
      style: 'neutral',
      mode: 'light',
      tokens: { table: { 'data.sequential': ['#101010', '#fefefe'] } },
      colors,
    });

    expect(resolved.tokens['data.sequential']).toEqual(['#101010', '#fefefe']);
  });
});
