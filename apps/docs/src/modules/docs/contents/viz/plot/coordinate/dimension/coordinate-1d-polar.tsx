import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './coordinate-1d-polar.controls';
import { renderCoordinate1DPolar } from './coordinate-1d-polar.preview';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, renderCoordinate1DPolar);
/** 注册回退使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './coordinate-1d-polar.controls';
/** canonical 状态派生的源码 */
export const previewSource = controlledPreview.source;
/** 一维投影示例 */
const Preview: FC = controlledPreview.Component;
export default Preview;
