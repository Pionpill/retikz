import type { JsonValue } from '@retikz/core';
import type { IRPlot, IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { MarkValueKind, PlotCoordinate, PlotGuide, PlotScale } from '@retikz/plot';

import type { ChartRecipeStyleContext } from '../../_shared';

import { chartRecipeId } from '../../_shared';

/** Point Chart recipe 接受的严格字段或常量视觉通道 */
export type PointChartVisualChannel = { field: string; scale?: string } | { value: JsonValue };

/** 把 Point Chart 字段值或常量值通道转换为 Plot 标记值 */
export const pointChartMarkValueOf = (channel: PointChartVisualChannel) => {
  if ('field' in channel) {
    return {
      kind: MarkValueKind.Field,
      value: channel.field,
      ...(channel.scale === undefined ? {} : { scale: channel.scale }),
    };
  }
  return { kind: MarkValueKind.Constant, value: channel.value };
};

/** 为 Point 类型解析方案建立 x/y 比例尺与默认二维笛卡尔坐标 */
export const createPointChartCartesian2D = (
  type: string,
): {
  scales: readonly [IRPlotScaleOperation, IRPlotScaleOperation];
  coordinate: IRPlot['coordinate'];
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

/** 为 Point 类型解析方案建立可选的 x/y 坐标轴默认值 */
export const createPointChartAxisGuides = (
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
