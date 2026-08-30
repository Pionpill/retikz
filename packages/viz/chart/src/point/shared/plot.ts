import type { IRPlot, IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { PlotCoordinate, PlotGuide, PlotScale } from '@retikz/plot';

/** 普通 Point recipe 的连续位置比例尺默认 domain 留白 */
export const pointPositionDomainPadding = 0.02;

/** 生成 Point recipe 使用的稳定 Plot member identity */
export const pointRecipeId = (chartType: string, target: string): string => `__chart.${chartType}.${target}`;

/** 为 Point recipe 建立二维笛卡尔 scaffold */
export const pointCartesian2DOf = (
  chartType: string,
  positionDomainPadding: number = pointPositionDomainPadding,
): Readonly<{
  scales: readonly [IRPlotScaleOperation, IRPlotScaleOperation];
  coordinate: NonNullable<IRPlot['coordinate']>;
}> => {
  const x = pointRecipeId(chartType, 'scale.x');
  const y = pointRecipeId(chartType, 'scale.y');
  return {
    scales: [
      { type: PlotScale.Linear, name: x, domainPadding: positionDomainPadding },
      { type: PlotScale.Linear, name: y, domainPadding: positionDomainPadding },
    ],
    coordinate: { type: PlotCoordinate.Cartesian2D, x, y },
  };
};

/** 依据 Point recipe theme 创建默认轴 guide */
export const pointAxisGuidesOf = (
  chartType: string,
  theme: Readonly<{ axisEnabled: boolean; axisGridEnabled: boolean }>,
): ReadonlyArray<IRPlotGuide> => {
  if (!theme.axisEnabled) return [];
  return [
    {
      type: PlotGuide.Axis,
      dimension: 'x',
    },
    {
      type: PlotGuide.Axis,
      dimension: 'y',
      ...(theme.axisGridEnabled ? { grid: true } : {}),
    },
  ];
};
