import { BubbleChart, BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './bubble-appearance.controls';
import { gapminderBubbleData } from './bubble-basic.data';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, (values, dimensions) => (
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
));
/** 气泡固定映射下的外观演示 */
const Demo: FC = controlledPreview.Component;
/** 注册回退使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './bubble-appearance.controls';
/** canonical 状态派生多种接入源码 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: { 'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' } },
};
export default Demo;
