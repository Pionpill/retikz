import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { IRPlotCoordinateOperation, IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { MarkValueKind, PlotCoordinate, PlotGuide, PlotScale } from '@retikz/plot';

import type { ChartRecipeStyleContext } from '../../shared';

import { chartRecipeId } from '../../../shared';

/** Chart recipe 接受的严格 field 或 constant 视觉通道 */
export type ChartVisualChannel = { field: string; scale?: string } | { value: JsonValue };

/** 生成 Chart recipe 保留的稳定 Plot member id */
/** 把 Chart 的 field/value 通道规范化为 Plot mark value */
export const plotMarkValueOf = (channel: ChartVisualChannel): IRJsonObject => {
  if ('field' in channel) {
    return {
      kind: MarkValueKind.Field,
      value: channel.field,
      ...(channel.scale === undefined ? {} : { scale: channel.scale }),
    };
  }
  return { kind: MarkValueKind.Constant, value: channel.value };
};

/** 为二维 canonical recipe 建立 x/y scale 与默认 Cartesian2D root */
export const createChartCartesian2DSeed = (
  type: string,
): {
  scales: readonly [IRPlotScaleOperation, IRPlotScaleOperation];
  coordinate: IRPlotCoordinateOperation;
} => {
  const scaleX = chartRecipeId(type, 'scale.x');
  const scaleY = chartRecipeId(type, 'scale.y');
  return {
    scales: [
      { type: PlotScale.Linear, name: scaleX },
      { type: PlotScale.Linear, name: scaleY },
    ],
    coordinate: { type: PlotCoordinate.Cartesian2D, x: scaleX, y: scaleY },
  };
};

/** 为二维 canonical recipe 建立可选的 x/y axis defaults */
export const createChartAxisGuides = (
  type: string,
  style: ChartRecipeStyleContext,
  coordinateView?: string,
): Array<IRPlotGuide> =>
  style.axisEnabled
    ? [
        {
          type: PlotGuide.Axis,
          id: chartRecipeId(type, 'guide.x'),
          dimension: 'x',
          ...(coordinateView === undefined ? {} : { coordinateView }),
        },
        {
          type: PlotGuide.Axis,
          id: chartRecipeId(type, 'guide.y'),
          dimension: 'y',
          ...(style.axisGridEnabled ? { grid: true } : {}),
          ...(coordinateView === undefined ? {} : { coordinateView }),
        },
      ]
    : [];
