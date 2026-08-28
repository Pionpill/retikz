import type { CoreProviderContribution, IRJsonObject, IRScene } from '@retikz/core';
import type { LowerPlotsOptions } from '@retikz/plot';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { DataTransformBindingClass, DataTransformFieldEffect, DataTransformPhase, defineTransform } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { FlexLayoutArtifactSchema } from '@retikz/layout';
import { createPlotProviderContribution, PointMarkSchema } from '@retikz/plot';
import { PathClipProvider } from '@retikz/standard/clip';
import { describe, expect, it } from 'vitest';
import { array, boolean, literal, strictObject, string, undefined as zodUndefined } from 'zod';

import { ChartWarningCode } from '../../src';
import { defineChartMark, defineChartRecipe } from '../../src/_chart/contract';
import { createChartProviderContribution } from '../../src/_chart/providers';
import { createChartSourceSchema } from '../../src/_chart/schemas';
import { createScatterChartProviderContribution, ScatterChartSchema } from '../../src/point/scatter';

const resolveDirectEncodings = (context: { encodings: Readonly<Record<string, unknown>> }) => ({
  encodings: context.encodings as IRJsonObject,
  transform: [],
  scales: [],
  positionScales: {},
  removedRecipeScales: new Set<string>(),
});

const rows = [
  { x: 1, y: 2, size: 3 },
  { x: 2, y: 4, size: 5 },
];

const sceneIdsOf = (primitives: ReadonlyArray<{ id?: string; children?: ReadonlyArray<unknown> }>): Array<string> =>
  primitives.flatMap(primitive => [
    ...(primitive.id === undefined ? [] : [primitive.id]),
    ...sceneIdsOf((primitive.children ?? []) as Array<{ id?: string; children?: ReadonlyArray<unknown> }>),
  ]);

const compileDefinitionsOf = (
  chartContributions: ReadonlyArray<CoreProviderContribution>,
  lowerOptions: LowerPlotsOptions = {},
) => {
  const plot = createPlotProviderContribution({ 'scatter.rows': rows }, lowerOptions);
  return resolveCoreProviderDependencies({
    contributions: [...chartContributions, plot, { roots: [PathClipProvider.key], providers: [PathClipProvider] }],
  });
};

const sceneOf = (source: IRScene['children'][number]): IRScene => ({
  version: 1,
  type: 'scene',
  children: [source],
});

describe('Chart providers through Core compile', () => {
  it('grows the Plot item into the remaining fixed-height presentation space', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'scatter-presentation-height',
      data: { reference: 'scatter.rows' },
      layout: { width: 800, height: 500 },
      presentation: { title: 'Scatter' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y' },
      },
    });

    const result = compileToScene(sceneOf(source), compileDefinitionsOf([createScatterChartProviderContribution()]));
    const artifact = result.artifacts.find(value => value.kind === 'composite' && value.type === 'flexLayout');
    if (artifact === undefined) throw new Error('Expected Chart presentation FlexLayout compile artifact');
    const flex = FlexLayoutArtifactSchema.parse(artifact.value);
    const plotItem = flex.items.find(item => item.key === 'chart.plot');
    if (plotItem === undefined) throw new Error('Expected Chart Plot presentation item');

    expect(plotItem.slotBounds.height).toBeGreaterThan(300);
    expect(plotItem.slotBounds.y + plotItem.slotBounds.height).toBeCloseTo(
      flex.container.contentBounds.y + flex.container.contentBounds.height,
    );
  });

  it('compiles Scatter in one Scene with its provider contribution installed', () => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        ScatterChartSchema.parse({
          namespace: 'chart',
          type: 'point',
          id: 'scatter',
          data: { reference: 'scatter.rows' },
          recipe: {
            chartType: 'scatter',
            encodings: { x: 'x', y: 'y' },
            properties: { color: '#ef4444' },
            marks: [{ kind: 'scatter', override: true, properties: { opacity: 0.5 } }],
          },
          plotExtension: {
            marks: [
              {
                type: 'path',
                order: 'x',
                encoding: { x: { field: 'x' }, y: { field: 'size' } },
                stroke: { kind: 'constant', value: '#2563eb' },
              },
            ],
          },
        }),
      ],
    };

    const warnings: Array<{ code: string }> = [];
    const result = compileToScene(scene, {
      ...compileDefinitionsOf([createScatterChartProviderContribution()]),
      onWarn: warning => warnings.push({ code: warning.code }),
    });

    expect(result.scene.primitives).toHaveLength(1);
    expect(sceneIdsOf(result.scene.primitives)).toContain('scatter');
    expect(JSON.stringify(result.scene.primitives)).toContain('#2563eb');
    expect(warnings).toEqual([]);
  });

  it('parses unknown JSON with the selected Scatter schema before compiling through its provider', () => {
    const unknownJson: unknown = {
      namespace: 'chart',
      type: 'point',
      id: 'scatter-json',
      data: { reference: 'scatter.rows' },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
    };
    const source = ScatterChartSchema.parse(unknownJson);
    const result = compileToScene(sceneOf(source), compileDefinitionsOf([createScatterChartProviderContribution()]));

    expect(source.recipe.chartType).toBe('scatter');
    expect(sceneIdsOf(result.scene.primitives)).toContain('scatter-json');
  });

  it('keeps Plot panel identity when Scatter encoding facet compiles through the provider chain', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'scatter-facet',
      data: { reference: 'scatter.rows' },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'x', y: 'y', column: { field: 'size' } },
      },
    });

    const result = compileToScene(sceneOf(source), compileDefinitionsOf([createScatterChartProviderContribution()]));
    const ids = sceneIdsOf(result.scene.primitives);

    expect(ids).toContain('__chart.scatter.composition.facet.panel._.3');
    expect(ids).toContain('__chart.scatter.composition.facet.panel._.5');
  });

  it('shares custom runtime Definitions between Chart encoding resolution and Plot lowering', () => {
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
      compact: {
        phase: DataTransformPhase.FieldDerive,
        bindingClass: DataTransformBindingClass.Field,
        fieldEffect: DataTransformFieldEffect.Preserve,
      },
      apply: (inputRows, operation) => inputRows.map(row => ({ ...row, [operation.as]: row[operation.field] })),
    });
    const lowerOptions: LowerPlotsOptions = { transformDefinitions: [copyField] };
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'scatter-custom-transform',
      data: { reference: 'scatter.rows' },
      recipe: {
        chartType: 'scatter',
        encodings: {
          x: {
            transform: { kind: 'copy-chart-field', field: 'x', as: 'copiedX' },
            output: 'copiedX',
          },
          y: 'y',
        },
      },
    });

    const result = compileToScene(
      sceneOf(source),
      compileDefinitionsOf([createScatterChartProviderContribution([], lowerOptions)], lowerOptions),
    );

    expect(sceneIdsOf(result.scene.primitives)).toContain('scatter-custom-transform');
  });

  it('reports a diagnostic error when the parsed schema and installed chartType provider disagree', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'scatter-mismatch',
      data: { reference: 'scatter.rows' },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
    });

    const warnings: Array<{ code: string; message: string }> = [];
    const result = compileToScene(sceneOf(source), {
      ...compileDefinitionsOf([]),
      onWarn: warning => warnings.push({ code: warning.code, message: warning.message }),
    });

    expect(result.scene.primitives).toHaveLength(0);
    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'COMPOSITE_NOT_REGISTERED',
        message: expect.stringMatching(/chart\.point|scatter|provider/i),
      }),
    ]);
  });

  it('appends an unmatched override and reports one Chart warning through Core', () => {
    const markSchema = strictObject({ kind: literal('annotation'), override: boolean().optional() });
    const sourceSchema = createChartSourceSchema(
      'fixture',
      strictObject({
        chartType: literal('warning-fixture'),
        encodings: strictObject({ x: string(), y: string() }),
        marks: array(markSchema).optional(),
      }),
      zodUndefined().optional(),
    );
    const annotation = defineChartMark({
      kind: 'annotation',
      schema: markSchema,
      resolve: () => ({
        marks: [
          PointMarkSchema.parse({
            type: 'point',
            encoding: { x: { field: 'x' }, y: { field: 'y' } },
            opacity: { kind: 'constant', value: 0.25 },
          }),
        ],
      }),
    });
    const recipe = defineChartRecipe({
      chartType: 'warning-fixture',
      encodingSlots: ['x', 'y'],
      schema: sourceSchema,
      theme: {
        overridesSchema: strictObject({}),
        resolutionSchema: strictObject({}),
        fallback: {},
      },
      consumes: { encodings: ['x', 'y'], properties: [] },
      marks: [{ definition: annotation, inherit: {} }],
      resolveEncodings: resolveDirectEncodings,
      resolve: () => ({
        scaffold: {
          scales: [],
          spatial: { coordinate: { type: 'cartesian2D' }, replaceable: true },
        },
        semanticMarks: [
          {
            kind: 'semantic',
            plotMarks: [
              PointMarkSchema.parse({
                type: 'point',
                encoding: { x: { field: 'x' }, y: { field: 'y' } },
              }),
            ],
          },
        ],
      }),
    });
    const source = sourceSchema.parse({
      namespace: 'chart',
      type: 'fixture',
      data: { reference: 'scatter.rows' },
      recipe: {
        chartType: 'warning-fixture',
        encodings: { x: 'x', y: 'y' },
        marks: [{ kind: 'annotation', override: true }],
      },
    });
    const warnings: Array<{ code: string; path: string }> = [];

    const result = compileToScene(sceneOf(source), {
      ...compileDefinitionsOf([createChartProviderContribution({ family: 'fixture', recipe })]),
      onWarn: warning => warnings.push({ code: warning.code, path: warning.path }),
    });

    expect(result.scene.primitives).not.toHaveLength(0);
    expect(warnings).toEqual([
      {
        code: ChartWarningCode.MarkOverrideTargetNotFound,
        path: 'children[0].recipe.marks[0].override',
      },
    ]);
  });
});
