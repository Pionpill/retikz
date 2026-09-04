import type { CoreProviderContribution, IRJsonObject, IRScene } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';

import {
  compileToScene,
  resolveCoreProviderDependencies,
  resolveDefaultCoreThemeColors,
  ThemeMode,
} from '@retikz/core';
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
import {
  ConnectedScatterChartSchema,
  createConnectedScatterChartProviderContribution,
} from '../../src/point/connected-scatter';
import { createRangedDotChartProviderContribution, RangedDotChartSchema } from '../../src/point/ranged-dot';
import { createRegressionChartProviderContribution, RegressionChartSchema } from '../../src/point/regression';
import { createScatterChartProviderContribution, ScatterChartSchema } from '../../src/point/scatter';
import { createStripChartProviderContribution, StripChartSchema } from '../../src/point/strip';

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
  commands?: ReadonlyArray<{ kind?: string; to?: [number, number] }>;
  fill?: unknown;
  stroke?: unknown;
  strokeWidth?: number;
  fillOpacity?: number;
  rx?: number;
  ry?: number;
  center?: readonly [number, number];
  cx?: number;
  cy?: number;
  radiusX?: number;
  radiusY?: number;
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
  it('compiles deterministic Cartesian Strip jitter through the shared Plot placement pipeline', () => {
    const stripRows = [
      { category: 'A', value: 2 },
      { category: 'A', value: 3 },
      { category: 'A', value: 4 },
      { category: 'B', value: 5 },
      { category: 'B', value: 6 },
    ];
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'strip-cartesian',
      data: { reference: 'strip.rows' },
      layout: { width: 480, height: 320 },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        properties: { size: 6, jitter: { span: { kind: 'ratio', value: 1 }, seed: 17 } },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createStripChartProviderContribution(),
        createPlotProviderContribution({ 'strip.rows': stripRows }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });

    const first = compileToScene(sceneOf(source), definitions);
    const second = compileToScene(sceneOf(source), definitions);
    const points = scenePrimitivesOfType(first.scene.primitives, 'ellipse');
    const centers = points
      .map(point => (point.cx === undefined || point.cy === undefined ? undefined : ([point.cx, point.cy] as const)))
      .filter((center): center is readonly [number, number] => center !== undefined);

    expect(points).toHaveLength(stripRows.length);
    expect(centers).toHaveLength(stripRows.length);
    expect(new Set(centers.slice(0, 3).map(center => center[0].toFixed(6))).size).toBeGreaterThan(1);
    expect(centers.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    expect(JSON.stringify(first.scene.primitives)).toBe(JSON.stringify(second.scene.primitives));
  });

  it.each([
    [
      'angle',
      {
        x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
        y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
      },
    ],
    [
      'radius',
      {
        x: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        y: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
      },
    ],
  ] as const)('compiles Polar Strip jitter on the discrete %s role', (_role, encodings) => {
    const stripRows = [
      { category: 'A', value: 2 },
      { category: 'A', value: 4 },
      { category: 'B', value: 6 },
    ];
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: `strip-polar-${_role}`,
      data: { reference: 'strip.polar' },
      layout: { width: 420, height: 420 },
      coordinate: { type: 'polar2D', innerRadius: 0.25 },
      recipe: {
        chartType: 'strip',
        encodings,
        properties: { size: 4, jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 9 } },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createStripChartProviderContribution(),
        createPlotProviderContribution({ 'strip.polar': stripRows }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });

    const result = compileToScene(sceneOf(source), definitions);
    const points = scenePrimitivesOfType(result.scene.primitives, 'ellipse');

    expect(points).toHaveLength(stripRows.length);
    expect(JSON.stringify(result.scene.primitives)).not.toMatch(/NaN|Infinity/);
  });

  it('allows an empty Strip data view but fails loud without the Strip provider', () => {
    const source = StripChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'strip.empty' },
      recipe: {
        chartType: 'strip',
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createStripChartProviderContribution(),
        createPlotProviderContribution({ 'strip.empty': [] }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });

    expect(scenePrimitivesOfType(compileToScene(sceneOf(source), definitions).scene.primitives, 'ellipse')).toEqual([]);
    expect(() =>
      compileToScene(
        sceneOf(source),
        compileDefinitionsOf([createScatterChartProviderContribution()], {
          positionAdjustmentDefinitions: [],
        }),
      ),
    ).toThrow(/strip|recipe|provider/i);
  });

  it('uses the first series palette color for every primitive in an ungrouped Point composite mark', () => {
    const defaultColor = resolveDefaultCoreThemeColors(ThemeMode.Light).categorical[0];
    const fixtures: ReadonlyArray<{
      source: IRScene['children'][number];
      contribution: CoreProviderContribution;
      datasets: ExternalDatasets;
    }> = [
      {
        source: ConnectedScatterChartSchema.parse({
          namespace: 'chart',
          type: 'point',
          data: { reference: 'connected.default-color' },
          recipe: {
            chartType: 'connected-scatter',
            encodings: { x: 'x', y: 'y', order: 'order' },
            properties: { point: { size: 4 }, path: { strokeWidth: 7 } },
          },
        }),
        contribution: createConnectedScatterChartProviderContribution(),
        datasets: {
          'connected.default-color': [
            { x: 1, y: 2, order: 1 },
            { x: 2, y: 4, order: 2 },
            { x: 3, y: 5, order: 3 },
          ],
        },
      },
      {
        source: RangedDotChartSchema.parse({
          namespace: 'chart',
          type: 'point',
          data: { reference: 'ranged.default-color' },
          recipe: {
            chartType: 'ranged-dot',
            encodings: { category: 'category', start: 'start', end: 'end' },
            properties: { point: { size: 4 }, range: { strokeWidth: 7 } },
          },
        }),
        contribution: createRangedDotChartProviderContribution(),
        datasets: {
          'ranged.default-color': [
            { category: 'A', start: 1, end: 3 },
            { category: 'B', start: 2, end: 5 },
          ],
        },
      },
    ];

    for (const fixture of fixtures) {
      const definitions = resolveCoreProviderDependencies({
        contributions: [
          fixture.contribution,
          createPlotProviderContribution(fixture.datasets),
          { roots: [PathClipProvider.key], providers: [PathClipProvider] },
        ],
      });
      const result = compileToScene(sceneOf(fixture.source), definitions);
      const paths = scenePrimitivesOfType(result.scene.primitives, 'path').filter(
        primitive => primitive.strokeWidth === 7,
      );
      const points = scenePrimitivesOfType(result.scene.primitives, 'ellipse');

      expect(paths.length).toBeGreaterThan(0);
      expect(points.length).toBeGreaterThan(0);
      expect(new Set(paths.map(path => path.stroke))).toEqual(new Set([defaultColor]));
      expect(new Set(points.map(point => point.fill))).toEqual(new Set([defaultColor]));
    }
  });

  it('uses consecutive series palette colors for ungrouped Regression observations and trend', () => {
    const palette = resolveDefaultCoreThemeColors(ThemeMode.Light).categorical;
    const source = RegressionChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'regression.default-color' },
      recipe: {
        chartType: 'regression',
        encodings: { x: 'x', y: 'y' },
        properties: { sampleCount: 3, point: { size: 4 }, trend: { strokeWidth: 7 } },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createRegressionChartProviderContribution(),
        createPlotProviderContribution({
          'regression.default-color': [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 5 },
          ],
        }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });
    const result = compileToScene(sceneOf(source), definitions);
    const trendPaths = scenePrimitivesOfType(result.scene.primitives, 'path').filter(
      primitive => primitive.strokeWidth === 7,
    );
    const observationPoints = scenePrimitivesOfType(result.scene.primitives, 'ellipse');

    expect(trendPaths.length).toBeGreaterThan(0);
    expect(observationPoints.length).toBeGreaterThan(0);
    expect(new Set(observationPoints.map(point => point.fill))).toEqual(new Set([palette[0]]));
    expect(new Set(trendPaths.map(path => path.stroke))).toEqual(new Set([palette[1]]));
  });

  it('compiles shuffled Connected Scatter rows by authored order and bridges invalid observations', () => {
    const connectedRows = [
      { series: 'A', x: 3, y: 3, order: 3 },
      { series: 'A', x: 1, y: 1, order: 1 },
      { series: 'A', x: 2, y: null, order: 2 },
      { series: 'A', x: 4, y: 4, order: 4 },
    ];
    const source = ConnectedScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'connected.rows' },
      recipe: {
        chartType: 'connected-scatter',
        encodings: { x: 'x', y: 'y', order: 'order', series: 'series' },
        properties: { path: { connectNulls: true, stroke: '#0f766e', strokeWidth: 5 } },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createConnectedScatterChartProviderContribution(),
        createPlotProviderContribution({ 'connected.rows': connectedRows }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });
    const result = compileToScene(sceneOf(source), definitions);
    const [trajectory] = scenePrimitivesOfType(result.scene.primitives, 'path').filter(
      primitive => primitive.stroke === '#0f766e' && primitive.strokeWidth === 5,
    );
    const positions = trajectory.commands?.flatMap(command => (Array.isArray(command.to) ? [command.to] : [])) ?? [];

    expect(positions).toHaveLength(3);
    expect(positions.map(position => position[0])).toEqual(
      [...positions.map(position => position[0])].sort((a, b) => a - b),
    );
    expect(scenePrimitivesOfType(result.scene.primitives, 'ellipse')).toHaveLength(3);
    expect(JSON.stringify(result.scene.primitives)).not.toMatch(/NaN|Infinity/);
  });

  it('atomically compiles mixed Ranged Dot rows with shared field colors and preserved range direction', () => {
    const rangedRows = [
      { category: 'Forward', start: 1, end: 3, group: 'A' },
      { category: 'Reverse', start: 5, end: 2, group: 'B' },
      { category: 'Zero', start: 4, end: 4, group: 'A' },
      { category: 'Invalid', start: null, end: 6, group: 'B' },
    ];
    const source = RangedDotChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      data: { reference: 'ranged.rows' },
      recipe: {
        chartType: 'ranged-dot',
        encodings: { category: 'category', start: 'start', end: 'end', color: 'group' },
        properties: {
          point: { shape: 'circle', size: 9 },
          range: { strokeWidth: 7 },
        },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        createRangedDotChartProviderContribution(),
        createPlotProviderContribution({ 'ranged.rows': rangedRows }),
        { roots: [PathClipProvider.key], providers: [PathClipProvider] },
      ],
    });
    const result = compileToScene(sceneOf(source), definitions);
    const connectors = scenePrimitivesOfType(result.scene.primitives, 'path').filter(
      primitive => primitive.strokeWidth === 7,
    );
    const endpoints = scenePrimitivesOfType(result.scene.primitives, 'ellipse');
    const connectorCommands = connectors.map(connector => connector.commands ?? []);
    const connectorColors = new Set(connectors.map(connector => connector.stroke));
    const endpointColors = new Set(endpoints.map(endpoint => endpoint.fill));

    expect(connectors).toHaveLength(3);
    expect(endpoints).toHaveLength(6);
    expect(endpoints.every(endpoint => endpoint.rx === endpoint.ry)).toBe(true);
    expect(endpointColors).toEqual(connectorColors);
    expect(
      connectorCommands.some(
        commands => commands[0]?.to?.[0] !== undefined && commands[0].to[0] > (commands[1]?.to?.[0] ?? Infinity),
      ),
    ).toBe(true);
    expect(
      connectorCommands.some(commands =>
        commands[0]?.to?.[0] !== undefined && commands[1]?.to?.[0] !== undefined
          ? commands[0].to[0] === commands[1].to[0]
          : false,
      ),
    ).toBe(true);
    expect(JSON.stringify(result.scene.primitives)).not.toMatch(/NaN|Infinity/);
  });

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
        properties: { sampleCount: 3, trend: { strokeWidth: 7 } },
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
    const observationPoints = scenePrimitivesOfType(result.scene.primitives, 'ellipse');
    const trendPaths = scenePrimitivesOfType(result.scene.primitives, 'path').filter(
      primitive => primitive.strokeWidth === 7,
    );

    expect(observationPoints).toHaveLength(regressionRows.length);
    expect(trendPaths).toHaveLength(2);
    expect(new Set(observationPoints.map(point => point.fill))).toEqual(new Set(trendPaths.map(path => path.stroke)));
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
