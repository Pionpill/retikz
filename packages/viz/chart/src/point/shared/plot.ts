import type { JsonValue } from '@retikz/core';
import type { IRPlot, IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { MarkValueKind, PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotGuide, PlotScale } from '@retikz/plot';

import type { ChartRecipeSource, ChartRecipeStyleContext } from '../../_shared';

import { chartRecipeId } from '../../_shared';

/** Point 类型解析方案接受的严格字段或常量视觉通道 */
export type ChartVisualChannel = { field: string; scale?: string } | { value: JsonValue };

/** 把 Point 的字段值或常量值通道规范化为 Plot 标记值 */
export const plotMarkValueOf = (channel: ChartVisualChannel) => {
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
export const createChartCartesian2D = (
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

type ChartPlotParts = Pick<IRPlot, 'scales' | 'marks' | 'guides'> & Partial<Pick<IRPlot, 'coordinate' | 'composition'>>;

/** 将类型 recipe 生成的 Plot 核心内容与用户提供的 Plot 字段组成完整 Plot */
export const createChartPlot = (spec: ChartRecipeSource, parts: ChartPlotParts): IRPlot => {
  const authoredScales = spec.plot.scales ?? [];
  const scales = [
    ...parts.scales.map(scale => authoredScales.find(authored => authored.name === scale.name) ?? scale),
    ...authoredScales.filter(authored => !parts.scales.some(scale => scale.name === authored.name)),
  ];
  const spatial =
    spec.plot.coordinate !== undefined
      ? { coordinate: spec.plot.coordinate }
      : spec.plot.composition !== undefined
        ? { composition: spec.plot.composition }
        : parts.coordinate !== undefined
          ? { coordinate: parts.coordinate }
          : parts.composition !== undefined
            ? { composition: parts.composition }
            : {};

  return {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(spec.id === undefined ? {} : { id: `${spec.id}/plot` }),
    data: spec.plot.data,
    ...(spec.plot.transform === undefined ? {} : { transform: spec.plot.transform }),
    scales,
    ...(spec.plot.plotThemeTokens === undefined ? {} : { plotThemeTokens: spec.plot.plotThemeTokens }),
    ...(spec.plot.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: spec.plot.plotThemeTokenRules }),
    ...(spec.plot.plotTheme === undefined ? {} : { plotTheme: spec.plot.plotTheme }),
    ...(spec.plot.width === undefined ? {} : { width: spec.plot.width }),
    ...(spec.plot.height === undefined ? {} : { height: spec.plot.height }),
    ...spatial,
    marks: [...parts.marks, ...(spec.plot.marks ?? [])],
    guides: spec.plot.guides ?? parts.guides,
    ...(spec.plot.meta === undefined ? {} : { meta: spec.plot.meta }),
  };
};
