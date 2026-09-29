import type { ScatterChartProps } from '@retikz/chart-react/point';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import { fertilityWorkData } from './scatter-fertility-work.data';

/** 固定映射后的散点外观配置 */
export type ScatterAppearancePreviewOptions = {
  layout?: ScatterChartProps['layout'];
  coordinateSystem: 'cartesian2D' | 'polar2D';
  size: number;
  opacity: number;
  stroke: string;
  strokeWidth: number;
};

/** 对比散点大小、透明度和描边 */
export const renderScatterAppearancePreview = (options: ScatterAppearancePreviewOptions) => {
  const { layout, coordinateSystem, size, opacity, stroke, strokeWidth } = options;
  return (
    <ScatterChart coordinate={{ type: coordinateSystem }} rows={fertilityWorkData} layout={layout}>
      <ScatterEncodings x="fertilityRate" y="femaleLaborParticipation" color="incomeGroup" shape="incomeGroup" />
      <ScatterProperties size={size} opacity={opacity} stroke={stroke} strokeWidth={strokeWidth} />
    </ScatterChart>
  );
};
