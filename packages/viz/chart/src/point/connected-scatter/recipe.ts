import type { IRJsonObject } from '@retikz/core';
import type { IRPlot, IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { PathMarkSchema, PlotGuide, PlotMark, PlotScale, PointMarkSchema } from '@retikz/plot';

import type { ChartRecipe, ChartRecipeStyleContext } from '../../_shared';
import type { IRConnectedScatterChart } from './schema';

import { bindChartRecipe, chartRecipeId, createChartRecipePlot } from '../../_shared';
import { PointChartType } from '../constants';
import { createPointChartAxisGuides, createPointChartCartesian2D, pointChartMarkValueOf } from '../shared';
import { ConnectedScatterChartSchema } from './schema';

/** 从 Connected Scatter 输入生成完整 Plot */
const createConnectedScatterPlot = (spec: IRConnectedScatterChart, style: ChartRecipeStyleContext): IRPlot => {
  const cartesian = createPointChartCartesian2D(PointChartType.ConnectedScatter);
  const coordinateView = spec.plot.composition?.defaultView;
  const authoredColor = spec.config.encoding.color;
  const authoredSeries = spec.config.encoding.series;
  let pointColor: IRJsonObject;
  let connectionStroke: IRJsonObject | undefined;
  let connectionColor: { field: string; scale: string } | undefined;
  let connectionSeries = authoredSeries;
  let colorScale: IRPlotScaleOperation | undefined;
  let colorScaleName: string | undefined;

  if (authoredColor?.field !== undefined) {
    colorScaleName = authoredColor.scale ?? chartRecipeId(PointChartType.ConnectedScatter, 'scale.color');
    const fieldColor = { field: authoredColor.field, scale: colorScaleName };
    pointColor = pointChartMarkValueOf(fieldColor);
    connectionColor = fieldColor;
    connectionSeries ??= authoredColor.field;
    if (authoredColor.scale === undefined) colorScale = { type: PlotScale.Ordinal, name: colorScaleName };
  } else if (authoredColor?.value !== undefined) {
    const constantColor = { value: authoredColor.value };
    pointColor = pointChartMarkValueOf(constantColor);
    connectionStroke = pointChartMarkValueOf(constantColor);
  } else if (authoredSeries !== undefined) {
    colorScaleName = chartRecipeId(PointChartType.ConnectedScatter, 'scale.series-color');
    const fieldColor = { field: authoredSeries, scale: colorScaleName };
    pointColor = pointChartMarkValueOf(fieldColor);
    connectionColor = fieldColor;
    colorScale = { type: PlotScale.Ordinal, name: colorScaleName };
  } else {
    const paletteColor = { value: style.seriesColor };
    pointColor = pointChartMarkValueOf(paletteColor);
    connectionStroke = pointChartMarkValueOf(paletteColor);
  }

  const generatedConnection = {
    type: PlotMark.Path,
    id: chartRecipeId(PointChartType.ConnectedScatter, 'mark.connection'),
    order: spec.config.encoding.order,
    ...(connectionSeries === undefined ? {} : { series: connectionSeries }),
    closed: false,
    ...(connectionStroke === undefined ? {} : { stroke: connectionStroke }),
    ...(coordinateView === undefined ? {} : { coordinateView }),
    encoding: {
      x: spec.config.encoding.x,
      y: spec.config.encoding.y,
      ...(connectionColor === undefined ? {} : { color: connectionColor }),
    },
  };
  const connection = PathMarkSchema.parse({
    ...generatedConnection,
    ...(spec.config.components?.connection ?? {}),
  });
  const generatedPoints = {
    type: PlotMark.Point,
    id: chartRecipeId(PointChartType.ConnectedScatter, 'mark.points'),
    color: pointColor,
    ...(coordinateView === undefined ? {} : { coordinateView }),
    encoding: { x: spec.config.encoding.x, y: spec.config.encoding.y },
  };
  const points = PointMarkSchema.parse({
    ...generatedPoints,
    ...(spec.config.mark ?? {}),
  });
  const axisGuides = createPointChartAxisGuides(PointChartType.ConnectedScatter, style, coordinateView);
  const colorGuide: IRPlotGuide | undefined =
    style.legendEnabled && spec.plot.guides === undefined && colorScaleName !== undefined
      ? { type: PlotGuide.Legend, channel: 'color', scale: colorScaleName }
      : undefined;

  return createChartRecipePlot(spec, {
    scales: [...cartesian.scales, ...(colorScale === undefined ? [] : [colorScale])],
    coordinate: cartesian.coordinate,
    marks: [connection, points],
    guides: [...axisGuides, ...(colorGuide === undefined ? [] : [colorGuide])],
  });
};

/** Connected Scatter 具体类型的内建解析方案 */
export const ConnectedScatterChartRecipe: ChartRecipe<IRConnectedScatterChart> = {
  type: PointChartType.ConnectedScatter,
  schema: ConnectedScatterChartSchema,
  bind: spec => bindChartRecipe(spec, createConnectedScatterPlot),
};
