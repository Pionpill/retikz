import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './coordinate-1d-playground.controls';
import { renderCoordinate1DPlayground } from './coordinate-1d-playground.preview';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, renderCoordinate1DPlayground);
/** 注册回退使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './coordinate-1d-playground.controls';
/** canonical 状态派生的源码 */
export const previewSource = controlledPreview.source;
/** 一维投影示例 */
const Preview: FC = controlledPreview.Component;
export default Preview;
