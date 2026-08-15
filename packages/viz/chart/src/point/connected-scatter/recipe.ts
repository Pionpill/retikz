import type { IRJsonObject } from '@retikz/core';
import type { IRPlotGuide, IRPlotScaleOperation, IRPlotSpec } from '@retikz/plot';

import { JsonObjectSchema, JsonValueSchema } from '@retikz/core';
import {
  PathMarkSchema,
  PLOT_NAMESPACE,
  PlotComposite,
  PlotCoordinate,
  PlotGuide,
  PlotMark,
  PlotScale,
  PointMarkSchema,
} from '@retikz/plot';

import type { ChartPatchChange, ChartRecipe, ChartRecipeSeed, ChartRecipeStyleContext } from '../recipe';
import type { IRConnectedScatterChartSpec } from './schema';

import { ChartMemberKind, chartRecipeId } from '../../shared';
import { PointChartType } from '../constants';
import { ChartRecipeInvariantError, ChartRecipeInvariantReason } from '../recipe';
import { createChartAxisGuides, createChartCartesian2DSeed, plotMarkValueOf } from '../shared';
import { ConnectedPathPatchSchema, ConnectedPointPatchSchema, ConnectedScatterChartSpecSchema } from './schema';

const connectedPointPatchPaths = ConnectedPointPatchSchema.keyof().options;
const connectedPathPatchPaths = ConnectedPathPatchSchema.keyof().options;

const jsonObject = (value: unknown): IRJsonObject => JsonObjectSchema.parse(value);

/** 把 Connected Scatter points patch 转成 resolution merge 的逐叶 change */
const connectedPointPatchChanges = (patch: IRConnectedScatterChartSpec['mark']): Array<ChartPatchChange> => {
  if (patch === undefined) return [];
  const changes: Array<ChartPatchChange> = [];
  for (const path of connectedPointPatchPaths) {
    const value = patch[path];
    if (value !== undefined) changes.push({ path: [path], value: JsonValueSchema.parse(value) });
  }
  return changes;
};

/** 把 Connected Scatter connection patch 转成 resolution merge 的逐叶 change */
const connectedPathPatchChanges = (
  patch: NonNullable<IRConnectedScatterChartSpec['components']>['connection'],
): Array<ChartPatchChange> => {
  if (patch === undefined) return [];
  const changes: Array<ChartPatchChange> = [];
  for (const path of connectedPathPatchPaths) {
    const value = patch[path];
    if (value !== undefined) changes.push({ path: [path], value: JsonValueSchema.parse(value) });
  }
  return changes;
};

/** 从 Connected Scatter 输入建立 resolver 消费的不可变 recipe seed */
const createConnectedScatterSeed = (
  spec: IRConnectedScatterChartSpec,
  style: ChartRecipeStyleContext,
): ChartRecipeSeed => {
  const cartesian = createChartCartesian2DSeed(PointChartType.ConnectedScatter);
  const coordinateView = spec.composition?.defaultView;
  const authoredColor = spec.encoding.color;
  const authoredSeries = spec.encoding.series;
  let pointColor: IRJsonObject;
  let connectionStroke: IRJsonObject | undefined;
  let connectionColor: { field: string; scale: string } | undefined;
  let connectionSeries = authoredSeries;
  let colorScale: IRPlotScaleOperation | undefined;
  let colorScaleName: string | undefined;

  if (authoredColor?.field !== undefined) {
    colorScaleName = authoredColor.scale ?? chartRecipeId(PointChartType.ConnectedScatter, 'scale.color');
    const fieldColor = { field: authoredColor.field, scale: colorScaleName };
    pointColor = plotMarkValueOf(fieldColor);
    connectionColor = fieldColor;
    connectionSeries ??= authoredColor.field;
    if (authoredColor.scale === undefined) colorScale = { type: PlotScale.Ordinal, name: colorScaleName };
  } else if (authoredColor?.value !== undefined) {
    const constantColor = { value: authoredColor.value };
    pointColor = plotMarkValueOf(constantColor);
    connectionStroke = plotMarkValueOf(constantColor);
  } else if (authoredSeries !== undefined) {
    colorScaleName = chartRecipeId(PointChartType.ConnectedScatter, 'scale.series-color');
    const fieldColor = { field: authoredSeries, scale: colorScaleName };
    pointColor = plotMarkValueOf(fieldColor);
    connectionColor = fieldColor;
    colorScale = { type: PlotScale.Ordinal, name: colorScaleName };
  } else {
    const paletteColor = { value: style.seriesColor };
    pointColor = plotMarkValueOf(paletteColor);
    connectionStroke = plotMarkValueOf(paletteColor);
  }

  const connection = PathMarkSchema.parse({
    type: PlotMark.Path,
    id: chartRecipeId(PointChartType.ConnectedScatter, 'mark.connection'),
    order: spec.encoding.order,
    ...(connectionSeries === undefined ? {} : { series: connectionSeries }),
    closed: false,
    ...(connectionStroke === undefined ? {} : { stroke: connectionStroke }),
    ...(coordinateView === undefined ? {} : { coordinateView }),
    encoding: {
      x: spec.encoding.x,
      y: spec.encoding.y,
      ...(connectionColor === undefined ? {} : { color: connectionColor }),
    },
  });
  const points = PointMarkSchema.parse({
    type: PlotMark.Point,
    id: chartRecipeId(PointChartType.ConnectedScatter, 'mark.points'),
    color: pointColor,
    ...(coordinateView === undefined ? {} : { coordinateView }),
    encoding: { x: spec.encoding.x, y: spec.encoding.y },
  });
  const axisGuides = createChartAxisGuides(PointChartType.ConnectedScatter, style, coordinateView);
  const colorGuide: IRPlotGuide | undefined =
    style.legendEnabled && spec.guides === undefined && colorScaleName !== undefined
      ? { type: PlotGuide.Legend, channel: 'color', scale: colorScaleName }
      : undefined;
  const guides = [...axisGuides, ...(colorGuide === undefined ? [] : [colorGuide])];
  const plot: IRPlotSpec = {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(spec.id === undefined ? {} : { id: `${spec.id}/plot` }),
    data: spec.data,
    scales: [...cartesian.scales, ...(colorScale === undefined ? [] : [colorScale])],
    ...(spec.composition === undefined ? { coordinate: cartesian.coordinate } : { composition: spec.composition }),
    marks: [connection, points],
    guides,
    ...(spec.width === undefined ? {} : { width: spec.width }),
    ...(spec.height === undefined ? {} : { height: spec.height }),
    ...(spec.meta === undefined ? {} : { meta: spec.meta }),
  };
  const spatialMember =
    spec.composition === undefined
      ? {
          target: 'coordinate.main',
          kind: ChartMemberKind.Coordinate,
          core: true,
          value: jsonObject(cartesian.coordinate),
          plotPath: ['coordinate'] as const,
          patchablePaths: [],
        }
      : {
          target: 'composition.main',
          kind: ChartMemberKind.Composition,
          core: true,
          value: jsonObject(spec.composition),
          plotPath: ['composition'] as const,
          patchablePaths: [],
        };
  const colorScaleMember =
    colorScale === undefined
      ? []
      : [
          {
            target: 'scale.color',
            kind: ChartMemberKind.Scale,
            core: true,
            value: jsonObject(colorScale),
            plotPath: ['scales', 2] as const,
            patchablePaths: [],
          },
        ];
  const guideMembers = guides.map((guide, index) => ({
    target: guide.type === PlotGuide.Legend ? 'guide.color' : guide.dimension === 'x' ? 'guide.x' : 'guide.y',
    kind: ChartMemberKind.Guide,
    core: false,
    value: jsonObject(guide),
    plotPath: ['guides', index] as const,
    patchablePaths: [],
  }));
  const connectionChanges = connectedPathPatchChanges(spec.components?.connection);
  const pointChanges = connectedPointPatchChanges(spec.mark);
  return {
    plot,
    members: [
      {
        target: 'scale.x',
        kind: ChartMemberKind.Scale,
        core: true,
        value: jsonObject(cartesian.scales[0]),
        plotPath: ['scales', 0],
        patchablePaths: [],
      },
      {
        target: 'scale.y',
        kind: ChartMemberKind.Scale,
        core: true,
        value: jsonObject(cartesian.scales[1]),
        plotPath: ['scales', 1],
        patchablePaths: [],
      },
      ...colorScaleMember,
      spatialMember,
      {
        target: 'mark.connection',
        kind: ChartMemberKind.Mark,
        core: true,
        value: jsonObject(connection),
        plotPath: ['marks', 0],
        patchablePaths: connectedPathPatchPaths.map(path => [path]),
      },
      {
        target: 'mark.points',
        kind: ChartMemberKind.Mark,
        core: true,
        value: jsonObject(points),
        plotPath: ['marks', 1],
        patchablePaths: connectedPointPatchPaths.map(path => [path]),
      },
      ...guideMembers,
    ],
    patches: [
      ...(connectionChanges.length === 0
        ? []
        : [
            {
              target: 'mark.connection',
              inputPath: ['components', 'connection'],
              changes: connectionChanges,
            },
          ]),
      ...(pointChanges.length === 0 ? [] : [{ target: 'mark.points', inputPath: ['mark'], changes: pointChanges }]),
    ],
  };
};

const sameChannel = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/** 验证 merge 后的 PlotSpec 仍保留 Connected Scatter 的不可撤销语义 */
const validateConnectedScatterCore = (spec: IRConnectedScatterChartSpec, plotSpec: IRPlotSpec): void => {
  const requiredScaleNames = [
    chartRecipeId(PointChartType.ConnectedScatter, 'scale.x'),
    chartRecipeId(PointChartType.ConnectedScatter, 'scale.y'),
  ];
  if (spec.encoding.color !== undefined && 'field' in spec.encoding.color) {
    requiredScaleNames.push(spec.encoding.color.scale ?? chartRecipeId(PointChartType.ConnectedScatter, 'scale.color'));
  } else if (spec.encoding.color === undefined && spec.encoding.series !== undefined) {
    requiredScaleNames.push(chartRecipeId(PointChartType.ConnectedScatter, 'scale.series-color'));
  }
  if (requiredScaleNames.some(name => !plotSpec.scales.some(scale => scale.name === name))) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.RequiredScale, ['scales']);
  }

  if (plotSpec.coordinate !== undefined) {
    if (
      plotSpec.coordinate.type === PlotCoordinate.Cartesian1D ||
      plotSpec.coordinate.type === PlotCoordinate.Polar1D
    ) {
      throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['coordinate']);
    }
  } else if (plotSpec.composition === undefined) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['coordinate']);
  } else {
    const defaultView = plotSpec.composition.views?.find(view => view.id === plotSpec.composition?.defaultView);
    if (
      defaultView?.coordinate.type === PlotCoordinate.Cartesian1D ||
      defaultView?.coordinate.type === PlotCoordinate.Polar1D
    ) {
      throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['composition', 'defaultView']);
    }
  }

  const connection = PathMarkSchema.safeParse(plotSpec.marks[0]);
  const points = PointMarkSchema.safeParse(plotSpec.marks[1]);
  const expectedView = plotSpec.composition?.defaultView;
  const expectedSeries =
    spec.encoding.series ??
    (spec.encoding.color !== undefined && 'field' in spec.encoding.color ? spec.encoding.color.field : undefined);
  if (
    !connection.success ||
    !points.success ||
    connection.data.id !== chartRecipeId(PointChartType.ConnectedScatter, 'mark.connection') ||
    points.data.id !== chartRecipeId(PointChartType.ConnectedScatter, 'mark.points') ||
    connection.data.closed !== false ||
    connection.data.order !== spec.encoding.order ||
    connection.data.series !== expectedSeries ||
    !sameChannel(connection.data.encoding.x, spec.encoding.x) ||
    !sameChannel(connection.data.encoding.y, spec.encoding.y) ||
    !sameChannel(points.data.encoding.x, spec.encoding.x) ||
    !sameChannel(points.data.encoding.y, spec.encoding.y) ||
    connection.data.coordinateView !== expectedView ||
    points.data.coordinateView !== expectedView
  ) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.CoreMark, ['marks']);
  }
};

/** Connected Scatter canonical type 的内建 recipe */
export const ConnectedScatterChartRecipe: ChartRecipe<IRConnectedScatterChartSpec> = {
  type: PointChartType.ConnectedScatter,
  schema: ConnectedScatterChartSpecSchema,
  createSeed: createConnectedScatterSeed,
  validateCore: validateConnectedScatterCore,
};
