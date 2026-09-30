import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './ribbon-cap-label.controls';
import { renderRibbonCapLabelPreview } from './ribbon-cap-label.preview';

export { createPreviewControlContract };
export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, renderRibbonCapLabelPreview);
export const previewSource = preview.source;
/** 端帽标签交互示例 */
const Demo: FC = preview.Component;
export default Demo;
