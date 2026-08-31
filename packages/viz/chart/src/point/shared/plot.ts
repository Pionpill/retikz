import type { IRJsonObject } from '@retikz/core';
import type { IRPlot, IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';

import { PlotCoordinate, PlotGuide, PlotScale } from '@retikz/plot';

import type { IRPointPositionDomainPadding } from './schema';

/** 普通 Point recipe 的连续位置比例尺默认 domain 留白 */
export const pointPositionDomainPadding = 0.02;

/** Point recipe 按位置角色确定后的 domain 留白 */
export type PointPositionDomainPaddingResolution = Readonly<{ x: number; y: number }>;

/** 从已校验的 Chart properties 解析按位置角色生效的 domain 留白 */
export const pointPositionDomainPaddingOf = (
  properties: IRJsonObject,
  fallback: number = pointPositionDomainPadding,
): PointPositionDomainPaddingResolution => {
  const domainPadding = properties.domainPadding as IRPointPositionDomainPadding | undefined;
  if (domainPadding === undefined) return { x: fallback, y: fallback };
  if (typeof domainPadding === 'number') return { x: domainPadding, y: domainPadding };
  return { x: domainPadding.x ?? fallback, y: domainPadding.y ?? fallback };
};

/** 生成 Point recipe 使用的稳定 Plot member identity */
export const pointRecipeId = (chartType: string, target: string): string => `__chart.${chartType}.${target}`;

/** 为 Point recipe 建立二维笛卡尔 scaffold */
export const pointCartesian2DOf = (
  chartType: string,
  positionDomainPadding: PointPositionDomainPaddingResolution = {
    x: pointPositionDomainPadding,
    y: pointPositionDomainPadding,
  },
): Readonly<{
  scales: readonly [IRPlotScaleOperation, IRPlotScaleOperation];
  coordinate: NonNullable<IRPlot['coordinate']>;
}> => {
  const x = pointRecipeId(chartType, 'scale.x');
  const y = pointRecipeId(chartType, 'scale.y');
  return {
    scales: [
      { type: PlotScale.Linear, name: x, domainPadding: positionDomainPadding.x },
      { type: PlotScale.Linear, name: y, domainPadding: positionDomainPadding.y },
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
