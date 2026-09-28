import { BubbleChart, BubbleEncodings } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { gapminderBubbleData } from './bubble-basic.data';
import { createPreviewControlContract } from './bubble-encodings.controls';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, (values, dimensions) => (
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
));
/** 气泡字段映射演示 */
const Demo: FC = controlledPreview.Component;
/** 注册回退使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './bubble-encodings.controls';
/** canonical 状态派生多种接入源码 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: { 'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' } },
};
export default Demo;
