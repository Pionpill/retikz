import type { CompileWarning, IRScene, ScenePrimitive } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { AnyScaleDefinition, IRPlotSpec } from '@retikz/plot';

import { compileToScene } from '@retikz/core';
import {
  createCoordinateFrame,
  createPlotLocator,
  defineCoordinate,
  defineScale,
  linearPositionScale,
  lowerPlots,
  lowerPlotWithLineage,
  PlotSpecSchema,
  resolveLinearScale,
} from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { resolveChartSpec, ScatterChartDefinition } from '../../src/pipeline';

const rows = [
  { id: 'a', x: 1, y: 4, weight: 1 },
  { id: 'b', x: 2, y: 7, weight: 9 },
];
const datasets: ExternalDatasets = { rows };

const base = {
  namespace: 'chart',
  type: 'scatter',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: { field: 'x' }, y: { field: 'y' } },
} as const;

const sceneOf = (child: IRScene['children'][number]): IRScene => ({ version: 1, type: 'scene', children: [child] });

const collectPrimitiveIds = (primitives: ReadonlyArray<ScenePrimitive>): Array<string> =>
  primitives.flatMap(primitive => [
    ...(primitive.id === undefined ? [] : [primitive.id]),
    ...(primitive.type === 'group' ? collectPrimitiveIds(primitive.children) : []),
  ]);

const collectPlotTrace = (
  primitives: ReadonlyArray<ScenePrimitive>,
): Array<{ type: ScenePrimitive['type']; id?: string; meta: NonNullable<ScenePrimitive['meta']> }> =>
  primitives.flatMap(primitive => [
    ...(primitive.meta?.source === 'plot'
      ? [
          {
            type: primitive.type,
            ...(primitive.id === undefined ? {} : { id: primitive.id }),
            meta: primitive.meta,
          },
        ]
      : []),
    ...(primitive.type === 'group' ? collectPlotTrace(primitive.children) : []),
  ]);

const scatterCoordinate2D = defineCoordinate({
  schema: z.strictObject({
    type: z.literal('scatter-test-2d').describe('Discriminator for the test-only two-dimensional coordinate'),
  }),
  roles: ['x', 'y'],
  resolve: (_operation, context) => {
    const xValues = context.collectRoleValues('x');
    const yValues = context.collectRoleValues('y');
    const xScale = context.buildPositionScale(context.resolveScaleForRole('x', undefined, xValues), xValues, [
      0,
      context.width,
    ]);
    const yScale = context.buildPositionScale(context.resolveScaleForRole('y', undefined, yValues), yValues, [
      context.height,
      0,
    ]);
    return {
      frame: createCoordinateFrame('scatter-test-2d', ['x', 'y'], values => [
        xScale.coordinate(values[0]),
        yScale.coordinate(values[1]),
      ]),
      plotArea: { x: 0, y: 0, width: context.width, height: context.height },
      gridLayers: [],
      axisLayers: [],
    };
  },
});

const scatterCoordinate1D = defineCoordinate({
  schema: z.strictObject({
    type: z.literal('scatter-test-1d').describe('Discriminator for the test-only one-dimensional coordinate'),
  }),
  roles: ['x'],
  resolve: (_operation, context) => ({
    frame: createCoordinateFrame('scatter-test-1d', ['x'], values => [Number(values[0]), context.height / 2]),
    plotArea: { x: 0, y: 0, width: context.width, height: context.height },
    gridLayers: [],
    axisLayers: [],
  }),
});

const scatterUnitScale = defineScale({
  family: 'position',
  schema: z.strictObject({
    type: z.literal('scatter-unit').describe('Discriminator for the test-only unit position scale'),
    name: z.string().min(1).describe('Registered scale identity'),
  }),
  isFieldCompatible: () => true,
  allowsBaseline: true,
  resolve: (_definition, values, range) =>
    linearPositionScale(
      resolveLinearScale(
        { domain: [0, 10] },
        values.filter((value): value is number => typeof value === 'number'),
        range,
      ),
    ),
}) as AnyScaleDefinition;

const chartWithCustomCoordinate = {
  ...base,
  styleTokens: { 'axis.enabled': false },
  coordinate: { type: 'scatter-test-2d' },
} as const;

const chartWithCustomScale = {
  ...base,
  styleTokens: { 'axis.enabled': false },
  scales: [
    { type: 'scatter-unit', name: '__chart.scatter.scale.x' },
    { type: 'linear', name: '__chart.scatter.scale.y' },
  ],
} as const;

describe('Scatter Chart pipeline', () => {
  it('resolves the canonical variant through the closed recipe tuple', () => {
    const { theme, ...plot } = resolveChartSpec(base).plotSpec;

    expect(theme).toBeDefined();
    expect(plot).toMatchObject({
      namespace: 'plot',
      type: 'plot',
      id: 'sales/plot',
      scales: [
        { type: 'linear', name: '__chart.scatter.scale.x' },
        { type: 'linear', name: '__chart.scatter.scale.y' },
      ],
      coordinate: {
        type: 'cartesian2D',
        x: '__chart.scatter.scale.x',
        y: '__chart.scatter.scale.y',
      },
      marks: [{ type: 'point', id: '__chart.scatter.mark.main' }],
    });
  });

  it('distinguishes field size defaults, constant size, authored guides and mark patch precedence', () => {
    const field = resolveChartSpec({
      ...base,
      encoding: { ...base.encoding, size: { field: 'weight' } },
      mark: { color: { kind: 'constant', value: '#dc2626' } },
    }).plotSpec;
    expect(field.marks[0]).toMatchObject({
      size: { kind: 'field', value: 'weight' },
      color: { kind: 'constant', value: '#dc2626' },
    });
    expect(field.guides).toContainEqual({
      type: 'legend',
      channel: 'size',
    });

    const constant = resolveChartSpec({
      ...base,
      encoding: { ...base.encoding, size: { value: 6 } },
    }).plotSpec;
    expect(constant.marks[0]).toMatchObject({ size: { kind: 'constant', value: 6 } });
    expect(constant.guides?.some(guide => guide.type === 'legend')).toBe(false);

    const authored = resolveChartSpec({
      ...base,
      encoding: { ...base.encoding, size: { field: 'weight' } },
      guides: [{ type: 'axis', id: 'authored-axis', dimension: 'x' }],
    }).plotSpec;
    expect(authored.guides).toEqual([{ type: 'axis', id: 'authored-axis', dimension: 'x' }]);
  });

  it('deep-merges Point encoding capabilities while keeping x/y and canonical identity', () => {
    const resolution = resolveChartSpec({
      ...base,
      mark: {
        color: { kind: 'constant', value: '#dc2626' },
        encoding: {
          text: { field: 'label' },
          color: { value: '#2563eb' },
          channels: { halo: { value: 0.5 } },
          depth: { field: 'depth' },
        },
      },
    });

    expect(resolution.plotSpec.marks[0]).toMatchObject({
      type: 'point',
      id: '__chart.scatter.mark.main',
      color: { kind: 'constant', value: '#dc2626' },
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        text: { field: 'label' },
        color: { value: '#2563eb' },
        channels: { halo: { value: 0.5 } },
        depth: { field: 'depth' },
      },
    });
    expect(resolution.inspection.members.find(member => member.target === 'mark.main')?.sources).toEqual([
      { kind: 'type-default', path: '$recipe/scatter/mark.main' },
      { kind: 'user-override', path: '$spec/mark' },
    ]);
  });

  it('binds automatic size guides only to the final effective size descriptor', () => {
    const constantOverride = resolveChartSpec({
      ...base,
      encoding: { ...base.encoding, size: { field: 'weight', scale: 'weight-radius' } },
      mark: { size: { kind: 'constant', value: 7 } },
    }).plotSpec;
    expect(constantOverride.marks[0]).toMatchObject({ size: { kind: 'constant', value: 7 } });
    expect(constantOverride.guides?.some(guide => guide.type === 'legend')).toBe(false);

    const fieldOverride = resolveChartSpec({
      ...base,
      encoding: { ...base.encoding, size: { value: 4 } },
      mark: { size: { kind: 'field', value: 'importance', scale: 'importance-radius' } },
    }).plotSpec;
    expect(fieldOverride.guides).toContainEqual({
      type: 'legend',
      channel: 'size',
      scale: 'importance-radius',
    });

    for (const textMode of [
      {
        ...base,
        encoding: { ...base.encoding, size: { field: 'weight' } },
        mark: { encoding: { text: { field: 'label' } } },
      },
      {
        ...base,
        mark: {
          size: { kind: 'field', value: 'importance', scale: 'importance-radius' },
          encoding: { text: { field: 'label' } },
        },
      },
    ] as const) {
      const textPlot = resolveChartSpec(textMode).plotSpec;
      expect(textPlot.guides?.some(guide => guide.type === 'legend' && guide.channel === 'size')).toBe(false);
    }

    const authored = resolveChartSpec({
      ...base,
      mark: { size: { kind: 'field', value: 'importance', scale: 'importance-radius' } },
      guides: [{ type: 'axis', id: 'authored-axis', dimension: 'x' }],
    }).plotSpec;
    expect(authored.guides).toEqual([{ type: 'axis', id: 'authored-axis', dimension: 'x' }]);
  });

  it('preserves scale, spatial-root and mark extension paths without replacing the core Point', () => {
    const plot = resolveChartSpec({
      ...base,
      scales: [{ type: 'log', name: '__chart.scatter.scale.x', base: 2 }],
      coordinate: {
        type: 'polar2D',
        angle: '__chart.scatter.scale.x',
        radius: '__chart.scatter.scale.y',
      },
      marks: [
        {
          type: 'point',
          id: 'extension.point',
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    }).plotSpec;

    expect(plot.scales[0]).toEqual({ type: 'log', name: '__chart.scatter.scale.x', base: 2 });
    expect(plot.coordinate).toMatchObject({ type: 'polar2D' });
    expect(plot.marks.map(mark => mark.id)).toEqual(['__chart.scatter.mark.main', 'extension.point']);
  });

  it('binds the core Point and axes to the authored composition default view', () => {
    const plot = resolveChartSpec({
      ...base,
      composition: {
        defaultView: 'main',
        views: [
          {
            id: 'main',
            coordinate: {
              type: 'cartesian2D',
              x: '__chart.scatter.scale.x',
              y: '__chart.scatter.scale.y',
            },
          },
        ],
      },
    }).plotSpec;

    expect(plot.coordinate).toBeUndefined();
    expect(plot.composition?.defaultView).toBe('main');
    expect(plot.marks[0].coordinateView).toBe('main');
    const axes = plot.guides?.filter(guide => guide.type === 'axis') ?? [];
    expect(axes.map(axis => axis.dimension)).toEqual(['x', 'y']);
    expect(axes.every(axis => axis.coordinateView === 'main')).toBe(true);
  });

  it('rejects a composition whose explicit default view is a known one-dimensional coordinate', () => {
    try {
      resolveChartSpec({
        ...base,
        composition: {
          defaultView: 'main',
          views: [{ id: 'main', coordinate: { type: 'cartesian1D' } }],
        },
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'core-recipe-violation',
        path: ['composition', 'defaultView'],
        cause: { reason: 'spatial-root' },
      });
      return;
    }
    throw new Error('expected one-dimensional composition to fail');
  });

  it('protects reserved identities and exposes the per-type composite definition', () => {
    expect(() =>
      resolveChartSpec({
        ...base,
        marks: [
          {
            type: 'point',
            id: '__chart.scatter.mark.main',
            encoding: { x: { field: 'x' }, y: { field: 'y' } },
          },
        ],
      }),
    ).toThrow(/duplicate|reserved/i);
    expect(ScatterChartDefinition.expand(base)).toEqual(resolveChartSpec(base).node);
  });

  it('recursively lowers real Point data and the field-size legend through Plot', () => {
    const warnings: Array<CompileWarning> = [];
    const chart = { ...base, encoding: { ...base.encoding, size: { field: 'weight' } } } as const;
    const result = compileToScene(sceneOf(chart), {
      composites: [
        ScatterChartDefinition,
        ...lowerPlots(datasets, { width: 320, height: 180, provenance: true, datumProvenance: true }),
      ],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([]);
    expect(collectPrimitiveIds(result.scene.primitives)).toContain('sales/plot.legend.size');
  });

  it('does not lower a size legend for Scatter text mode', () => {
    const chart = {
      ...base,
      encoding: { ...base.encoding, size: { field: 'weight' } },
      mark: { encoding: { text: { value: 'point' } } },
    } as const;
    const result = compileToScene(sceneOf(chart), {
      composites: [ScatterChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
    });

    expect(collectPrimitiveIds(result.scene.primitives)).not.toContain('sales/plot.legend.size');
  });

  it('passes a custom two-dimensional coordinate definition only through Plot lowering', () => {
    const warnings: Array<CompileWarning> = [];
    const result = compileToScene(sceneOf(chartWithCustomCoordinate), {
      composites: [
        ScatterChartDefinition,
        ...lowerPlots(datasets, {
          width: 320,
          height: 180,
          coordinates: [scatterCoordinate2D],
        }),
      ],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([]);
    expect(result.scene.primitives.length).toBeGreaterThan(0);
  });

  it('passes a referenced custom scale definition only through Plot lowering', () => {
    const result = compileToScene(sceneOf(chartWithCustomScale), {
      composites: [
        ScatterChartDefinition,
        ...lowerPlots(datasets, { width: 320, height: 180, scaleDefinitions: [scatterUnitScale] }),
      ],
      onWarn: () => undefined,
    });

    expect(result.scene.primitives.length).toBeGreaterThan(0);
  });

  it('keeps Plot diagnostics for missing definitions and non-two-dimensional coordinates', () => {
    const customBase = { ...base, styleTokens: { 'axis.enabled': false } } as const;
    expect(() =>
      compileToScene(sceneOf(chartWithCustomCoordinate), {
        composites: [ScatterChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
        onWarn: () => undefined,
      }),
    ).toThrow(/coordinate type "scatter-test-2d" is not registered/);
    expect(() =>
      compileToScene(sceneOf({ ...customBase, coordinate: { type: 'scatter-test-1d' } }), {
        composites: [
          ScatterChartDefinition,
          ...lowerPlots(datasets, { width: 320, height: 180, coordinates: [scatterCoordinate1D] }),
        ],
        onWarn: () => undefined,
      }),
    ).toThrow(/does not support encoding role "y"|requires position channels/);
    expect(() =>
      compileToScene(sceneOf(chartWithCustomScale), {
        composites: [ScatterChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
        onWarn: () => undefined,
      }),
    ).toThrow(/scale type "scatter-unit" is not registered/);
  });

  it('keeps recipe inspection, datum locator and lineage continuous through the Chart wrapper', () => {
    const resolution = resolveChartSpec({
      ...base,
      mark: { opacity: { kind: 'constant', value: 0.6 } },
    });
    const mainMember = resolution.inspection.members.find(member => member.target === 'mark.main');

    expect(mainMember).toMatchObject({
      kind: 'mark',
      id: '__chart.scatter.mark.main',
      core: true,
      sources: [
        { kind: 'type-default', path: '$recipe/scatter/mark.main' },
        { kind: 'user-override', path: '$spec/mark' },
      ],
    });
    const barePlotSpec: IRPlotSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales/plot',
      data: { reference: 'rows' },
      scales: [
        { type: 'linear', name: '__chart.scatter.scale.x' },
        { type: 'linear', name: '__chart.scatter.scale.y' },
      ],
      coordinate: {
        type: 'cartesian2D',
        x: '__chart.scatter.scale.x',
        y: '__chart.scatter.scale.y',
      },
      marks: [
        {
          type: 'point',
          id: '__chart.scatter.mark.main',
          opacity: { kind: 'constant', value: 0.6 },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
      guides: [
        { type: 'axis', id: '__chart.scatter.guide.x', dimension: 'x' },
        { type: 'axis', id: '__chart.scatter.guide.y', dimension: 'y', grid: true },
      ],
      theme: resolution.plotSpec.theme,
    });
    const options = { width: 320, height: 180, provenance: true, datumProvenance: true, datumIdField: 'id' } as const;
    const resolvedLocator = createPlotLocator(resolution.plotSpec, datasets, options);
    const bareLocator = createPlotLocator(barePlotSpec, datasets, options);
    expect(resolvedLocator.datum(1)).toEqual(bareLocator.datum(1));
    expect(resolvedLocator.datum(1)?.meta).toMatchObject({
      source: 'plot',
      dataReference: 'rows',
      transformedIndex: 1,
      sourceIndex: 1,
    });
    const lineageOptions = {
      ...options,
      lineage: { data: { sourceIdentity: true, transformSteps: true }, scaleMappings: true },
    } as const;
    const resolvedLineage = lowerPlotWithLineage(resolution.plotSpec, datasets, lineageOptions).lineage;
    const bareLineage = lowerPlotWithLineage(barePlotSpec, datasets, lineageOptions).lineage;
    expect(JSON.stringify(resolvedLineage)).toBe(JSON.stringify(bareLineage));
    expect(resolvedLineage).toMatchObject({
      plotId: 'sales/plot',
      dataReference: 'rows',
      marks: [{ markIndex: 0, markType: 'point', markId: '__chart.scatter.mark.main' }],
    });
    const wrappedScene = compileToScene(sceneOf({ ...base, mark: { opacity: { kind: 'constant', value: 0.6 } } }), {
      composites: [ScatterChartDefinition, ...lowerPlots(datasets, options)],
      onWarn: () => undefined,
    }).scene;
    const bareScene = compileToScene(sceneOf(barePlotSpec), {
      composites: lowerPlots(datasets, options),
      onWarn: () => undefined,
    }).scene;
    expect(collectPlotTrace(wrappedScene.primitives)).toEqual(collectPlotTrace(bareScene.primitives));
  });
});
