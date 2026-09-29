import { BubbleChart, BubbleEncodings } from '@retikz/chart-react/point';

import { gapminderBubbleData } from './bubble-basic.data';

/** 图形参数 */
export type BubbleEncodingsPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  color: boolean;
};

/** 绘制示例图形 */
export const renderBubbleEncodingsPreview = (
  values: BubbleEncodingsPreviewValues,
  dimensions?: { width: number; height: number },
) => (
  <BubbleChart
    coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
    rows={gapminderBubbleData}
    layout={dimensions}
  >
    <BubbleEncodings
      x="gdpPerCapita"
      y="lifeExpectancy"
      size="population"
      {...(values.color ? { color: 'continent' } : {})}
    />
  </BubbleChart>
);
