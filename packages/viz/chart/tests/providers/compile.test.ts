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
import { BubbleChartSchema, createBubbleChartProviderContribution } from '../../src/point/bubble';
import { createRegressionChartProviderContribution, RegressionChartSchema } from '../../src/point/regression';
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

/** 测试中递归检查 Scene 图元所需的最小结构 */
type ScenePrimitiveLike = {
  type: string;
  children?: ReadonlyArray<ScenePrimitiveLike>;
  fill?: unknown;
  stroke?: unknown;
  fillOpacity?: number;
};

/** 递归收集指定类型的 Scene 图元 */
const scenePrimitivesOfType = (
  primitives: ReadonlyArray<ScenePrimitiveLike>,
  type: string,
): Array<ScenePrimitiveLike> =>
  primitives.flatMap(primitive => [
    ...(primitive.type === type ? [primitive] : []),
    ...scenePrimitivesOfType(primitive.children ?? [], type),
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
  it('compiles grouped Regression through Point + mark-local Smooth Path with finite Scene output', () => {
    const regressionRows = [
      { series: 'A', x: 1, y: 2 },
      { series: 'A', x: 2, y: 4 },
      { series: 'A', x: 3, y: 6 },
      { series: 'B', x: 1, y: 3 },
      { series: 'B', x: 2, y: 5 },
      { series: 'B', x: 3, y: 7 },
    ];
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'regression',
      data: { reference: 'regression.rows' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y', series: 'series' },
        properties: { sampleCount: 3 },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createRegressionChartProviderContribution(),
        createPlotProviderContribution({ 'regression.rows': regressionRows }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });
    const result = compileToScene(sceneOf(source), definitions);
    const serialized = JSON.stringify(result.scene.primitives);

    expect(sceneIdsOf(result.scene.primitives)).toContain('regression');
    expect(serialized).not.toContain('NaN');
    expect(serialized).not.toContain('Infinity');
    expect(scenePrimitivesOfType(result.scene.primitives, 'ellipse')).toHaveLength(regressionRows.length);
  });

  it('aborts the whole Regression compile when one series cannot be fitted', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'regression.invalid' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y', series: 'series' },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createRegressionChartProviderContribution(),
        createPlotProviderContribution({
          'regression.invalid': [
            { series: 'A', x: 1, y: 2 },
            { series: 'A', x: 2, y: 4 },
            { series: 'B', x: 1, y: 3 },
          ],
        }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });

    expect(() => compileToScene(sceneOf(source), definitions)).toThrow(/smooth|regression|series.*B|pairs/i);
  });

  it('fails loud when Regression Source is compiled without its concrete provider', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'scatter.rows' },
      recipe: { chartType: 'regression', encodings: { x: 'x', y: 'y' } },
    });

    expect(() =>
      compileToScene(sceneOf(source), compileDefinitionsOf([createScatterChartProviderContribution()])),
    ).toThrow(/chartType|scatter|regression/i);
  });

  it('keeps Regression facet identity distinct from Scatter and Bubble', () => {
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'regression-facet',
      data: { reference: 'regression.facet' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y', column: 'panel' },
        properties: { sampleCount: 2 },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createRegressionChartProviderContribution(),
        createPlotProviderContribution({
          'regression.facet': [
            { panel: 'left', x: 1, y: 2 },
            { panel: 'left', x: 2, y: 4 },
            { panel: 'right', x: 1, y: 3 },
            { panel: 'right', x: 2, y: 5 },
          ],
        }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });
    const ids = sceneIdsOf(compileToScene(sceneOf(source), definitions).scene.primitives);

    expect(ids.some(id => id.startsWith('__chart.regression.composition.facet.panel.'))).toBe(true);
    expect(ids.some(id => id.startsWith('__chart.scatter.composition.facet'))).toBe(false);
    expect(ids.some(id => id.startsWith('__chart.bubble.composition.facet'))).toBe(false);
  });

  it('compiles Bubble through the shared Point provider and preserves finite scene output', () => {
    const source = BubbleChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'bubble',
      data: { reference: 'scatter.rows' },
      recipe: {
        chartType: 'bubble',
        encodings: { x: 'x', y: 'y', size: 'size' },
        properties: { color: '#d946ef' },
      },
    });

    const result = compileToScene(
      sceneOf(source),
      compileDefinitionsOf([createScatterChartProviderContribution(), createBubbleChartProviderContribution()]),
    );
    const serializedScene = JSON.stringify(result.scene.primitives);

    expect(sceneIdsOf(result.scene.primitives)).toContain('bubble');
    expect(serializedScene).not.toContain('NaN');
    expect(serializedScene).not.toContain('Infinity');
    const bubblePrimitives = scenePrimitivesOfType(result.scene.primitives, 'ellipse').filter(
      primitive => primitive.fillOpacity === 0.7,
    );
    expect(bubblePrimitives).toHaveLength(rows.length);
    expect(bubblePrimitives.every(primitive => primitive.fill === '#d946ef')).toBe(true);
    expect(bubblePrimitives.every(primitive => primitive.stroke === primitive.fill)).toBe(true);
  });

  it('keeps Bubble facet identity distinct from Scatter', () => {
    const source = BubbleChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'bubble-facet',
      data: { reference: 'scatter.rows' },
      recipe: {
        chartType: 'bubble',
        encodings: { x: 'x', y: 'y', size: 'size', column: 'size' },
      },
    });

    const result = compileToScene(sceneOf(source), compileDefinitionsOf([createBubbleChartProviderContribution()]));
    const ids = sceneIdsOf(result.scene.primitives);

    expect(ids).toContain('__chart.bubble.composition.facet.panel._.3');
    expect(ids).toContain('__chart.bubble.composition.facet.panel._.5');
    expect(ids.some(id => id.startsWith('__chart.scatter.composition.facet'))).toBe(false);
  });

  it('keeps zero and singleton Bubble size domains finite', () => {
    for (const bubbleRows of [
      [
        { x: 1, y: 2, size: 0 },
        { x: 2, y: 4, size: 0 },
      ],
      [{ x: 1, y: 2, size: 5 }],
    ]) {
      const source = BubbleChartSchema.parse({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'bubble.rows' },
        recipe: { chartType: 'bubble', encodings: { x: 'x', y: 'y', size: 'size' } },
      });
      const plot = createPlotProviderContribution({ 'bubble.rows': bubbleRows });
      const definitions = resolveCoreProviderDependencies({
        contributions: [
          createBubbleChartProviderContribution(),
          plot,
          { roots: [PathClipProvider.key], providers: [PathClipProvider] },
        ],
      });
      const result = compileToScene(sceneOf(source), definitions);
      const serializedScene = JSON.stringify(result.scene.primitives);

      expect(serializedScene).not.toContain('NaN');
      expect(serializedScene).not.toContain('Infinity');
    }
  });

  it('rejects negative Bubble size values and named linear size scales', () => {
    const negativeSource = BubbleChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'bubble.rows' },
      recipe: { chartType: 'bubble', encodings: { x: 'x', y: 'y', size: 'size' } },
    });
    const negativeDefinitions = resolveCoreProviderDependencies({
      contributions: [
        createBubbleChartProviderContribution(),
        createPlotProviderContribution({ 'bubble.rows': [{ x: 1, y: 2, size: -1 }] }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });
    expect(() => compileToScene(sceneOf(negativeSource), negativeDefinitions)).toThrow(/size|sqrt|negative|domain/i);

    const linearSource = BubbleChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'bubble.rows' },
      recipe: {
        chartType: 'bubble',
        encodings: { x: 'x', y: 'y', size: { field: 'size', scale: { reference: 'linearSize' } } },
      },
      plotExtension: { scales: [{ type: 'linear', name: 'linearSize' }] },
    });
    const linearDefinitions = resolveCoreProviderDependencies({
      contributions: [
        createBubbleChartProviderContribution(),
        createPlotProviderContribution({ 'bubble.rows': [{ x: 1, y: 2, size: 3 }] }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });
    expect(() => compileToScene(sceneOf(linearSource), linearDefinitions)).toThrow(/size|sqrt|linear|scale/i);
  });

  it('fails loud when Bubble Source is compiled with only the Scatter recipe installed', () => {
    const source = BubbleChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'bubble-missing-provider',
      data: { reference: 'scatter.rows' },
      recipe: {
        chartType: 'bubble',
        encodings: { x: 'x', y: 'y', size: 'size' },
      },
    });
    expect(() =>
      compileToScene(sceneOf(source), compileDefinitionsOf([createScatterChartProviderContribution()])),
    ).toThrow(/chartType|scatter|bubble/i);
  });

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
      schedule: {
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
