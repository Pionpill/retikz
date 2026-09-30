import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './ribbon-custom-cap.controls';
import { renderRibbonCustomCapPreview } from './ribbon-custom-cap.preview';

export { createPreviewControlContract } from './ribbon-custom-cap.controls';
export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, renderRibbonCustomCapPreview);
export const previewSource = preview.source;
/** 自定义端帽的注入与方向控制 */
const Demo: FC = preview.Component;
export default Demo;
