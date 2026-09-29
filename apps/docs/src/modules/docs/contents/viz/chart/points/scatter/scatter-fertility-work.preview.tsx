import { ChartData } from '@retikz/chart-react';
import type { ScatterChartProps } from '@retikz/chart-react/point';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import { fertilityWorkData } from './scatter-fertility-work.data';

/** 分类编码散点图的可配置输入 */
export type ScatterFertilityWorkPreviewOptions = {
  layout?: ScatterChartProps['layout'];
  coordinateSystem: 'cartesian2D' | 'polar2D';
  colorByCategory: boolean;
  shapeByCategory: boolean;
};

/** 用相同的经济体数据比较颜色与形状编码 */
export const renderScatterFertilityWorkPreview = (options: ScatterFertilityWorkPreviewOptions) => {
  const { layout, coordinateSystem, colorByCategory, shapeByCategory } = options;
  return (
    <ScatterChart coordinate={{ type: coordinateSystem }} layout={layout}>
      <ChartData data={fertilityWorkData} />
      <ScatterEncodings
        x="fertilityRate"
        y="femaleLaborParticipation"
        {...(colorByCategory ? { color: 'incomeGroup' } : {})}
        {...(shapeByCategory ? { shape: 'incomeGroup' } : {})}
      />
      <ScatterProperties size={5} opacity={0.65} />
    </ScatterChart>
  );
};
