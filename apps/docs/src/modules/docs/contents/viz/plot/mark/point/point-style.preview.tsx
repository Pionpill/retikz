import type { IRPaint } from '@retikz/core';
import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { points } from './point-api.data';

const gradientFill: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

/** 图形参数 */
export type PointStylePreviewValues = {
  paintMode: 'field' | 'solid' | 'gradient';
  fill: string;
  stroke: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  opacity: number;
  size: number;
  dashed: boolean;
  shadow: 'none' | 'md' | 'xl';
  coordinate: 'cartesian2D' | 'polar2D';
};

/** 绘制示例图形 */
export const PointStylePreview = (values: PointStylePreviewValues) => {
  const usesFieldColor = values.paintMode === 'field';
  const fill =
    values.paintMode === 'gradient'
      ? gradientFill
      : values.paintMode === 'solid'
        ? { kind: 'constant' as const, value: values.fill }
        : undefined;
  const pointProps = {
    x: 'x',
    y: 'y',
    color: usesFieldColor ? 'region' : undefined,
    fill,
    stroke: { kind: 'constant' as const, value: values.stroke },
    strokeWidth: values.strokeWidth,
    fillOpacity: values.fillOpacity,
    strokeOpacity: values.strokeOpacity,
    opacity: values.opacity,
    size: values.size,
    dashed: values.dashed,
    shadow: values.shadow,
  };

  return (
    <Plot data={points} width={400} height={280} coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PointMark {...pointProps} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
