import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import {
  DataFieldType,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  defineStatisticsReducer,
  defineTransform,
} from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { defineScale } from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { resolveChartProviderRegistry } from '../../src/_chart/providers';
import { resolveSelectedChart } from '../../src/_chart/resolve';
import { qualifyScatterChartLocatorOptions } from '../../src/point/scatter/locator';
import { ScatterChartDefinition } from '../../src/point/scatter/recipe';
import { ScatterChartSchema } from '../../src/point/scatter/schema';

const registry = resolveChartProviderRegistry([
  { family: 'point', recipe: ScatterChartDefinition, themeDefinitions: [] },
]);

const resolveScatter = (
  recipe: Record<string, unknown>,
  plotExtension?: Record<string, unknown>,
  runtime = registry.runtime,
) => {
  const source = ScatterChartSchema.parse({
    namespace: 'chart',
    type: 'point',
    data: { reference: 'rows' },
    recipe: { chartType: 'scatter', ...recipe },
    ...(plotExtension === undefined ? {} : { plotExtension }),
  });
  return resolveSelectedChart(source, {
    theme: DEFAULT_RESOLVED_THEME,
    recipe: ScatterChartDefinition,
    themeDefinitions: [],
    runtime,
  });
};

describe('Scatter Chart encoding resolution', () => {
  it('merges aggregate mappings by ordered slots and groups only direct post-summary fields', () => {
    const result = resolveScatter({
      encodings: {
        color: { aggregate: { kind: 'max', field: 'intensity', as: 'maxIntensity' } },
        y: { aggregate: { kind: 'mean', field: 'margin', as: 'meanMargin' } },
        x: 'species',
        shape: 'island',
      },
    });

    expect(result.plot.transform).toEqual([
      {
        kind: 'summarize',
        groupBy: ['species', 'island'],
        metrics: [
          { kind: 'mean', field: 'margin', as: 'meanMargin' },
          { kind: 'max', field: 'intensity', as: 'maxIntensity' },
        ],
      },
    ]);
    expect(result.plot.marks[0]).toMatchObject({
      encoding: { x: { field: 'species' }, y: { field: 'meanMargin' } },
      color: { kind: 'field', value: 'maxIntensity' },
      shape: { kind: 'field', value: 'island' },
    });
  });

  it('keeps ordered hierarchy dimensions in aggregate groupBy', () => {
    const result = resolveScatter({
      encodings: {
        x: { aggregate: { kind: 'mean', field: 'amount', as: 'meanAmount' } },
        y: 'margin',
        row: [{ field: 'region' }, { field: 'market' }],
        column: 'year',
      },
    });

    expect(result.plot.transform).toEqual([
      {
        kind: 'summarize',
        groupBy: ['margin', 'region', 'market', 'year'],
        metrics: [{ kind: 'mean', field: 'amount', as: 'meanAmount' }],
      },
    ]);
  });

  it('schedules extension transforms first and encoding transforms by phase then slot order', () => {
    const result = resolveScatter(
      {
        encodings: {
          y: {
            transform: { kind: 'jitter', axis: 'y', yField: 'margin', amount: 0.5 },
            output: 'margin',
          },
          x: {
            transform: { kind: 'normalize', field: 'amount', as: 'amountShare' },
            output: 'amountShare',
          },
        },
      },
      { transform: [{ kind: 'sort', field: 'time', order: 'descending' }] },
    );

    expect(result.plot.transform).toEqual([
      { kind: 'sort', field: 'time', order: 'descending' },
      { kind: 'normalize', field: 'amount', as: 'amountShare' },
      { kind: 'jitter', axis: 'y', yField: 'margin', amount: 0.5 },
    ]);
    expect(result.plot.marks[0]).toMatchObject({
      encoding: { x: { field: 'amountShare' }, y: { field: 'margin' } },
    });
  });

  it('rejects an encoding transform already declared by plotExtension', () => {
    const operation = { kind: 'normalize', field: 'amount', as: 'amountShare' };

    expect(() =>
      resolveScatter(
        {
          encodings: {
            x: { transform: operation, output: 'amountShare' },
            y: 'margin',
          },
        },
        { transform: [operation] },
      ),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'x', 'transform'] }),
      }),
    );
  });

  it('rejects an encoding output already produced by plotExtension', () => {
    expect(() =>
      resolveScatter(
        {
          encodings: {
            x: {
              transform: { kind: 'normalize', field: 'amount', as: 'amountShare' },
              output: 'amountShare',
            },
            y: 'margin',
          },
        },
        { transform: [{ kind: 'normalize', field: 'weight', as: 'amountShare' }] },
      ),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'x', 'transform'] }),
      }),
    );
  });

  it('rejects an encoding transform that reads an output from a later scheduler phase', () => {
    expect(() =>
      resolveScatter({
        encodings: {
          x: {
            transform: { kind: 'jitter', axis: 'x', xField: 'amount', amount: 0.5 },
            output: 'amount',
          },
          y: {
            transform: { kind: 'normalize', field: 'amount', as: 'normalizedAmount' },
            output: 'normalizedAmount',
          },
        },
      }),
    ).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings', 'y'] }) }),
    );
  });

  it('rejects row-shaping combinations that remove later inputs or final bindings', () => {
    expect(() =>
      resolveScatter({
        encodings: {
          x: {
            transform: { kind: 'bin', field: 'amount', startField: 'binStart', endField: 'binEnd' },
            output: 'binStart',
          },
          y: 'margin',
          color: { aggregate: { kind: 'max', field: 'intensity', as: 'maxIntensity' } },
        },
      }),
    ).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings', 'color'] }) }),
    );

    expect(() =>
      resolveScatter({
        encodings: {
          x: { aggregate: { kind: 'sum', field: 'amount', as: 'totalAmount' } },
          y: {
            transform: {
              kind: 'bin',
              field: 'totalMargin',
              startField: 'binStart',
              endField: 'binEnd',
            },
            output: 'binStart',
          },
          color: { aggregate: { kind: 'sum', field: 'margin', as: 'totalMargin' } },
        },
      }),
    ).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings', 'x'] }) }),
    );
  });

  it('connects named scales once and replaces only the authored position fallback', () => {
    const result = resolveScatter({
      encodings: {
        x: {
          field: 'amount',
          scale: { operation: { type: 'log', name: 'amountScale' } },
        },
        y: {
          field: 'margin',
          scale: { reference: '__chart.scatter.scale.y' },
        },
        color: {
          field: 'group',
          scale: { operation: { type: 'ordinal', name: 'groupColorScale' } },
        },
        size: {
          field: 'weight',
          scale: { operation: { type: 'sqrt', name: 'weightSizeScale' } },
        },
        opacity: {
          field: 'confidence',
          scale: { operation: { type: 'linear', name: 'confidenceOpacityScale' } },
        },
      },
    });

    expect(result.plot.scales.map(scale => scale.name)).toEqual([
      '__chart.scatter.scale.y',
      'amountScale',
      'groupColorScale',
      'weightSizeScale',
      'confidenceOpacityScale',
    ]);
    expect(result.plot.coordinate).toMatchObject({ x: 'amountScale', y: '__chart.scatter.scale.y' });
    expect(result.plot.marks[0]).toMatchObject({
      color: { kind: 'field', value: 'group', scale: 'groupColorScale' },
      size: { kind: 'field', value: 'weight', scale: 'weightSizeScale' },
      opacity: { kind: 'field', value: 'confidence', scale: 'confidenceOpacityScale' },
    });
  });

  it('rejects duplicate scale sources and missing references', () => {
    expect(() =>
      resolveScatter(
        {
          encodings: {
            x: { field: 'amount', scale: { operation: { type: 'log', name: 'duplicate' } } },
            y: 'margin',
          },
        },
        { scales: [{ type: 'linear', name: 'duplicate' }] },
      ),
    ).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings', 'x', 'scale'] }) }),
    );

    expect(() =>
      resolveScatter({
        encodings: {
          x: { field: 'amount', scale: { reference: 'missing' } },
          y: 'margin',
        },
      }),
    ).toThrowError(
      expect.objectContaining({ details: expect.objectContaining({ path: ['recipe', 'encodings', 'x', 'scale'] }) }),
    );
  });

  it('rejects cross-slot recipe fallback references', () => {
    for (const encodings of [
      {
        x: { field: 'amount', scale: { reference: '__chart.scatter.scale.y' } },
        y: 'margin',
      },
      {
        x: 'amount',
        y: { field: 'margin', scale: { reference: '__chart.scatter.scale.x' } },
      },
    ]) {
      expect(() => resolveScatter({ encodings })).toThrowError(
        expect.objectContaining({
          details: expect.objectContaining({
            path: expect.arrayContaining(['recipe', 'encodings', 'scale']),
          }),
        }),
      );
    }
  });

  it('assembles facet composition from Plot-owned atoms', () => {
    const facet = resolveScatter({
      encodings: {
        x: 'amount',
        y: 'margin',
        row: 'channel',
        column: [{ field: 'region', order: ['east', 'west'] }],
        facet: { empty: 'show', spacing: { panelGap: 12 } },
      },
    });
    expect(facet.plot.composition).toMatchObject({
      defaultView: '__chart.scatter.view.main',
      arrangements: [
        {
          kind: 'facet',
          id: '__chart.scatter.composition.facet',
          view: '__chart.scatter.view.main',
          row: { field: 'channel' },
          column: [{ field: 'region', order: ['east', 'west'] }],
          empty: 'show',
        },
      ],
    });
  });

  it('projects rich root mappings before authored marks inherit them', () => {
    const result = resolveScatter({
      encodings: {
        x: 'species',
        y: { aggregate: { kind: 'mean', field: 'margin', as: 'meanMargin' } },
        size: {
          field: 'weight',
          scale: { operation: { type: 'sqrt', name: 'weightSizeScale' } },
        },
      },
      marks: [{ kind: 'scatter', properties: { opacity: 0.5 } }],
    });

    expect(result.plot.marks).toHaveLength(2);
    for (const mark of result.plot.marks) {
      expect(mark).toMatchObject({
        encoding: { x: { field: 'species' }, y: { field: 'meanMargin' } },
        size: { kind: 'field', value: 'weight', scale: 'weightSizeScale' },
      });
    }
  });

  it('qualifies Chart-facing facet locators with fixed Scatter identity', () => {
    expect(qualifyScatterChartLocatorOptions({ facet: { row: 'north', column: [2025, 2026] } })).toEqual({
      facet: {
        id: '__chart.scatter.composition.facet',
        row: 'north',
        column: [2025, 2026],
      },
    });
  });

  it('resolves custom transform, reducer and scale operations through owner Definitions', () => {
    const copyField = defineTransform({
      schema: strictObject({
        kind: literal('copy-chart-field'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputFields: operation => [operation.as],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.as, type: { from: operation.field } }],
      }),
      schedule: {
        phase: DataTransformPhase.FieldDerive,
        bindingClass: DataTransformBindingClass.Field,
        fieldEffect: DataTransformFieldEffect.Preserve,
      },
      apply: (rows, operation) => rows.map(row => ({ ...row, [operation.as]: row[operation.field] })),
    });
    const range = defineStatisticsReducer({
      schema: strictObject({
        kind: literal('range-chart-value'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputFields: operation => [operation.as],
      outputs: operation => [{ field: operation.as, type: DataFieldType.Continuous }],
      reduce: (rows, operation) => {
        const values = rows.map(row => Number(row[operation.field]));
        return { [operation.as]: Math.max(...values) - Math.min(...values) };
      },
    });
    const mono = defineScale({
      family: 'channel',
      schema: strictObject({ type: literal('mono-chart'), name: NonBlankStringSchema }),
      isFieldCompatible: () => true,
      resolve: () => ({
        of: () => '#111111',
        legendForm: 'swatch',
        domain: [],
        range: ['#111111'],
        scaleType: 'mono-chart',
      }),
    });
    const customRegistry = resolveChartProviderRegistry([
      {
        family: 'point',
        recipe: ScatterChartDefinition,
        themeDefinitions: [],
        runtimeDefinitions: {
          transformDefinitions: [copyField],
          statisticsReducerDefinitions: [range],
          scaleDefinitions: [mono],
        },
      },
    ]);

    const transformed = resolveScatter(
      {
        encodings: {
          x: {
            transform: { kind: 'copy-chart-field', field: 'amount', as: 'copiedAmount' },
            output: 'copiedAmount',
          },
          y: 'margin',
          color: {
            field: 'group',
            scale: { operation: { type: 'mono-chart', name: 'groupMono' } },
          },
        },
      },
      undefined,
      customRegistry.runtime,
    );
    expect(transformed.plot.transform).toEqual([{ kind: 'copy-chart-field', field: 'amount', as: 'copiedAmount' }]);
    expect(transformed.plot.scales).toContainEqual({ type: 'mono-chart', name: 'groupMono' });

    const aggregated = resolveScatter(
      {
        encodings: {
          x: 'group',
          y: 'margin',
          color: { aggregate: { kind: 'range-chart-value', field: 'amount', as: 'amountRange' } },
        },
      },
      undefined,
      customRegistry.runtime,
    );
    expect(aggregated.plot.transform).toEqual([
      {
        kind: 'summarize',
        groupBy: ['group', 'margin'],
        metrics: [{ kind: 'range-chart-value', field: 'amount', as: 'amountRange' }],
      },
    ]);
  });

  it('locates unregistered custom operations at the concrete encoding mapping', () => {
    expect(() =>
      resolveScatter({
        encodings: {
          x: { transform: { kind: 'missing-transform' }, output: 'x' },
          y: 'margin',
        },
      }),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'x', 'transform'] }),
      }),
    );
    expect(() =>
      resolveScatter({
        encodings: {
          x: 'amount',
          y: 'margin',
          color: { aggregate: { kind: 'missing-reducer', field: 'amount', as: 'missing' } },
        },
      }),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'color', 'aggregate'] }),
      }),
    );
    expect(() =>
      resolveScatter({
        encodings: {
          x: 'amount',
          y: 'margin',
          color: { field: 'group', scale: { operation: { type: 'missing-scale', name: 'missing' } } },
        },
      }),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: ['recipe', 'encodings', 'color', 'scale'] }),
      }),
    );
  });
});
