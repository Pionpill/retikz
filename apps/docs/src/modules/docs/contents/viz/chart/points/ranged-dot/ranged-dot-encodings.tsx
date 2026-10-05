import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './ranged-dot-encodings.controls';
import { renderRangedDotEncodingsPreview } from './ranged-dot-encodings.preview';

const contract = createPreviewControlContract();

const controlled = defineControlledPreview(contract, (values, dimensions) =>
  renderRangedDotEncodingsPreview(
    {
      coordinateSystem: values.coordinateSystem,
      reverse: values.reverse,
    },
    dimensions,
  ),
);

/** 映射交互示例 */
const Demo: FC = controlled.Component;

/** 预览使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './ranged-dot-encodings.controls';
/** 根据默认映射派生多种接入源码 */
export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'rangedDotData', from: './ranged-dot-basic.data' } },
};
export default Demo;
