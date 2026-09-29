import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './bubble-appearance.controls';
import { renderBubbleAppearancePreview } from './bubble-appearance.preview';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, (values, dimensions) =>
  renderBubbleAppearancePreview(
    {
      coordinateSystem: values.coordinateSystem,
      fillOpacity: values.fillOpacity,
      stroke: values.stroke,
      strokeWidth: values.strokeWidth,
      shape: values.shape,
    },
    dimensions,
  ),
);
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
