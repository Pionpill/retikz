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
  PathMarkSchema,
  PlotSpecSchema,
  PointMarkSchema,
  resolveLinearScale,
} from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ConnectedScatterChartDefinition, resolveChartSpec } from '../../../src/resolution';

const rows = [
  { id: 'a', x: 1, y: 4, month: 1, region: 'north', group: 'warm' },
  { id: 'b', x: 2, y: 7, month: 2, region: 'north', group: 'warm' },
  { id: 'c', x: 3, y: 5, month: 1, region: 'south', group: 'cool' },
  { id: 'd', x: 4, y: 8, month: 2, region: 'south', group: 'cool' },
];
const datasets: ExternalDatasets = { rows };

const base = {
  namespace: 'chart',
  type: 'connected-scatter',
  id: 'journey',
  data: { reference: 'rows' },
  encoding: { x: { field: 'x' }, y: { field: 'y' }, order: 'month' },
} as const;

const seriesChart = {
  ...base,
  encoding: { ...base.encoding, series: 'region' },
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

const connectedCoordinate2D = defineCoordinate({
  schema: z.strictObject({
    type: z.literal('connected-test-2d').describe('Discriminator for a test-only two-dimensional coordinate'),
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
      frame: createCoordinateFrame('connected-test-2d', ['x', 'y'], values => [
        xScale.coordinate(values[0]),
        yScale.coordinate(values[1]),
      ]),
      plotArea: { x: 0, y: 0, width: context.width, height: context.height },
      gridLayers: [],
      axisLayers: [],
    };
  },
});

const connectedUnitScale = defineScale({
  family: 'position',
  schema: z.strictObject({
    type: z.literal('connected-unit').describe('Discriminator for a test-only unit position scale'),
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
  styleTokens: { 'chart.axis.enabled': false },
  coordinate: { type: 'connected-test-2d' },
} as const;

const chartWithCustomScale = {
  ...base,
  styleTokens: { 'chart.axis.enabled': false },
  scales: [
    { type: 'connected-unit', name: '__chart.connected-scatter.scale.x' },
    { type: 'linear', name: '__chart.connected-scatter.scale.y' },
  ],
} as const;

describe('Connected Scatter Chart resolution', () => {
  it('resolves the dual-mark canonical variant through the closed recipe tuple', () => {
    const plot = resolveChartSpec(base).plotSpec;
    const connection = PathMarkSchema.parse(plot.marks[0]);
    const points = PointMarkSchema.parse(plot.marks[1]);

    expect(plot.marks.map(mark => ({ type: mark.type, id: mark.id }))).toEqual([
      { type: 'path', id: '__chart.connected-scatter.mark.connection' },
      { type: 'point', id: '__chart.connected-scatter.mark.points' },
    ]);
    expect(connection).toMatchObject({ order: 'month', closed: false });
    expect(connection.encoding).toEqual(points.encoding);
    expect(connection.stroke).toEqual(points.color);
    expect(plot.scales).toHaveLength(2);
    expect(plot.guides?.some(guide => guide.type === 'legend')).toBe(false);
  });

  it('merges authored guides, component patches and extensions without replacing either core mark', () => {
    const plot = resolveChartSpec({
      ...base,
      encoding: { ...base.encoding, color: { field: 'group' } },
      guides: [{ type: 'axis', id: 'authored-axis', dimension: 'x' }],
      mark: { color: { kind: 'constant', value: '#dc2626' } },
      components: { connection: { stroke: { kind: 'constant', value: '#16a34a' }, curve: 'basis' } },
      marks: [
        {
          type: 'point',
          id: 'extension.point',
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    }).plotSpec;

    expect(plot.guides).toEqual([{ type: 'axis', id: 'authored-axis', dimension: 'x' }]);
    expect(plot.marks.map(mark => mark.id)).toEqual([
      '__chart.connected-scatter.mark.connection',
      '__chart.connected-scatter.mark.points',
      'extension.point',
    ]);
    expect(plot.marks[0]).toMatchObject({
      curve: 'basis',
      stroke: { kind: 'constant', value: '#16a34a' },
      order: 'month',
      series: 'group',
      closed: false,
    });
    expect(plot.marks[1]).toMatchObject({ color: { kind: 'constant', value: '#dc2626' } });
  });

  it('protects reserved mark identities and exposes the per-type composite definition', () => {
    expect(() =>
      resolveChartSpec({
        ...base,
        marks: [
          {
            type: 'point',
            id: '__chart.connected-scatter.mark.points',
            encoding: { x: { field: 'x' }, y: { field: 'y' } },
          },
        ],
      }),
    ).toThrow(/duplicate|reserved/i);
    expect(ConnectedScatterChartDefinition.expand(base)).toEqual(resolveChartSpec(base).node);
  });

  it('recursively lowers the Path, Point and series color legend through Plot', () => {
    const warnings: Array<CompileWarning> = [];
    const result = compileToScene(sceneOf(seriesChart), {
      composites: [
        ConnectedScatterChartDefinition,
        ...lowerPlots(datasets, { width: 320, height: 180, provenance: true, datumProvenance: true }),
      ],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([]);
    expect(collectPrimitiveIds(result.scene.primitives)).toContain('journey/plot.legend.color');
    expect(collectPlotTrace(result.scene.primitives).some(primitive => primitive.meta.series === 'north')).toBe(true);
  });

  it('keeps Plot field/scale compatibility and series-color consistency diagnostics', () => {
    const continuousSeries = {
      ...seriesChart,
      data: {
        reference: 'rows',
        model: [
          { name: 'x', type: 'continuous' },
          { name: 'y', type: 'continuous' },
          { name: 'month', type: 'continuous' },
          { name: 'region', type: 'continuous' },
        ],
      },
    } as const;
    expect(() =>
      compileToScene(sceneOf(continuousSeries), {
        composites: [ConnectedScatterChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
        onWarn: () => undefined,
      }),
    ).toThrow(/continuous\/temporal color|incompatible/i);

    const inconsistentRows = {
      rows: [
        { x: 1, y: 4, month: 1, region: 'north', group: 'warm' },
        { x: 2, y: 7, month: 2, region: 'north', group: 'cool' },
      ],
    };
    const inconsistentColor = {
      ...base,
      encoding: { ...base.encoding, series: 'region', color: { field: 'group', scale: 'groupColor' } },
      scales: [{ type: 'ordinal', name: 'groupColor' }],
    } as const;
    expect(() =>
      compileToScene(sceneOf(inconsistentColor), {
        composites: [ConnectedScatterChartDefinition, ...lowerPlots(inconsistentRows, { width: 320, height: 180 })],
        onWarn: () => undefined,
      }),
    ).toThrow(/not constant within series/);
  });

  it('passes custom coordinate and scale definitions only through Plot lowering', () => {
    expect(
      compileToScene(sceneOf(chartWithCustomCoordinate), {
        composites: [
          ConnectedScatterChartDefinition,
          ...lowerPlots(datasets, { width: 320, height: 180, coordinates: [connectedCoordinate2D] }),
        ],
        onWarn: () => undefined,
      }).scene.primitives.length,
    ).toBeGreaterThan(0);
    expect(
      compileToScene(sceneOf(chartWithCustomScale), {
        composites: [
          ConnectedScatterChartDefinition,
          ...lowerPlots(datasets, { width: 320, height: 180, scaleDefinitions: [connectedUnitScale] }),
        ],
        onWarn: () => undefined,
      }).scene.primitives.length,
    ).toBeGreaterThan(0);
  });

  it('keeps missing definitions and non-two-dimensional roots fail-loud', () => {
    expect(() =>
      compileToScene(sceneOf(chartWithCustomCoordinate), {
        composites: [ConnectedScatterChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
        onWarn: () => undefined,
      }),
    ).toThrow(/coordinate type "connected-test-2d" is not registered/);
    expect(() =>
      compileToScene(sceneOf(chartWithCustomScale), {
        composites: [ConnectedScatterChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
        onWarn: () => undefined,
      }),
    ).toThrow(/scale type "connected-unit" is not registered/);
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

  it('keeps inspection, Point datum, Path series, locator and lineage equal to a bare Plot', () => {
    const resolution = resolveChartSpec(seriesChart);
    const connectionMember = resolution.inspection.members.find(member => member.target === 'mark.connection');
    const pointMember = resolution.inspection.members.find(member => member.target === 'mark.points');

    expect(connectionMember).toMatchObject({
      kind: 'mark',
      id: '__chart.connected-scatter.mark.connection',
      core: true,
      sources: [{ kind: 'type-default', path: '$recipe/connected-scatter/mark.connection' }],
    });
    expect(pointMember).toMatchObject({
      kind: 'mark',
      id: '__chart.connected-scatter.mark.points',
      core: true,
      sources: [{ kind: 'type-default', path: '$recipe/connected-scatter/mark.points' }],
    });
    const barePlotSpec: IRPlotSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'journey/plot',
      data: { reference: 'rows' },
      scales: [
        { type: 'linear', name: '__chart.connected-scatter.scale.x' },
        { type: 'linear', name: '__chart.connected-scatter.scale.y' },
        { type: 'ordinal', name: '__chart.connected-scatter.scale.series-color' },
      ],
      coordinate: {
        type: 'cartesian2D',
        x: '__chart.connected-scatter.scale.x',
        y: '__chart.connected-scatter.scale.y',
      },
      marks: [
        {
          type: 'path',
          id: '__chart.connected-scatter.mark.connection',
          order: 'month',
          series: 'region',
          closed: false,
          encoding: {
            x: { field: 'x' },
            y: { field: 'y' },
            color: { field: 'region', scale: '__chart.connected-scatter.scale.series-color' },
          },
        },
        {
          type: 'point',
          id: '__chart.connected-scatter.mark.points',
          color: {
            kind: 'field',
            value: 'region',
            scale: '__chart.connected-scatter.scale.series-color',
          },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
      guides: [
        { type: 'axis', id: '__chart.connected-scatter.guide.x', dimension: 'x' },
        { type: 'axis', id: '__chart.connected-scatter.guide.y', dimension: 'y', grid: true },
        { type: 'legend', channel: 'color', scale: '__chart.connected-scatter.scale.series-color' },
      ],
      theme: resolution.plotSpec.theme,
    });
    const options = {
      width: 320,
      height: 180,
      provenance: true,
      datumProvenance: true,
      datumIdField: 'id',
    } as const;
    const resolvedLocator = createPlotLocator(resolution.plotSpec, datasets, options);
    const bareLocator = createPlotLocator(barePlotSpec, datasets, options);
    expect(resolvedLocator.series('north', { markIndex: 0 })).toEqual(bareLocator.series('north', { markIndex: 0 }));
    expect(resolvedLocator.datum(1, { markIndex: 1 })).toEqual(bareLocator.datum(1, { markIndex: 1 }));
    expect(resolvedLocator.series('north', { markIndex: 0 })?.meta).toMatchObject({ series: 'north' });
    expect(resolvedLocator.datum(1, { markIndex: 1 })?.meta).toMatchObject({
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
      plotId: 'journey/plot',
      dataReference: 'rows',
      marks: [
        { markIndex: 0, markType: 'path', markId: '__chart.connected-scatter.mark.connection' },
        { markIndex: 1, markType: 'point', markId: '__chart.connected-scatter.mark.points' },
      ],
    });
    const wrappedScene = compileToScene(sceneOf(seriesChart), {
      composites: [ConnectedScatterChartDefinition, ...lowerPlots(datasets, options)],
      onWarn: () => undefined,
    }).scene;
    const bareScene = compileToScene(sceneOf(barePlotSpec), {
      composites: lowerPlots(datasets, options),
      onWarn: () => undefined,
    }).scene;
    expect(collectPlotTrace(wrappedScene.primitives)).toEqual(collectPlotTrace(bareScene.primitives));
  });
});
