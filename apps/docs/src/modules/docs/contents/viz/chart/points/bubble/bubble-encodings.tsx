import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './bubble-encodings.controls';
import { renderBubbleEncodingsPreview } from './bubble-encodings.preview';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, (values, dimensions) =>
  renderBubbleEncodingsPreview(
    {
      coordinateSystem: values.coordinateSystem,
      color: values.color,
    },
    dimensions,
  ),
);
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
