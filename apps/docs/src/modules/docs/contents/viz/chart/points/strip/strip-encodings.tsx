import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './strip-encodings.controls';
import { renderStripEncodingsPreview } from './strip-encodings.preview';

const contract = createPreviewControlContract();
const controlled = defineControlledPreview(contract, (values, dimensions) =>
  renderStripEncodingsPreview(
    {
      coordinateSystem: values.coordinateSystem,
      role: values.role,
    },
    dimensions,
  ),
);
/** 映射交互示例 */
const Demo: FC = controlled.Component;
/** 预览使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './strip-encodings.controls';
/** 根据默认映射派生多种接入源码 */
export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'stripVegaBarleyData', from: './strip-vega-barley.data' } },
};
export default Demo;
