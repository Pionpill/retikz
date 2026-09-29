import { BubbleChart, BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point';

import { gapminderBubbleData } from './bubble-basic.data';

/** 图形参数 */
export type BubbleAppearancePreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  shape: 'circle' | 'rectangle' | 'diamond';
};

/** 绘制示例图形 */
export const renderBubbleAppearancePreview = (
  values: BubbleAppearancePreviewValues,
  dimensions?: { width: number; height: number },
) => (
  <BubbleChart
    coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
    rows={gapminderBubbleData}
    layout={dimensions}
  >
    <BubbleEncodings x="gdpPerCapita" y="lifeExpectancy" size="population" color="continent" />
    <BubbleProperties
      fillOpacity={values.fillOpacity}
      stroke={values.stroke}
      strokeWidth={values.strokeWidth}
      shape={values.shape}
    />
  </BubbleChart>
);
