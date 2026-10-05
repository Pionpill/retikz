import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './ribbon-label-support.controls';
import { renderRibbonLabelSupportPreview } from './ribbon-label-support.preview';

export { createPreviewControlContract } from './ribbon-label-support.controls';
export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, renderRibbonLabelSupportPreview);

export const previewSource = preview.source;

/** 端帽曲线支撑线与真实端点标签 */
const RibbonLabelSupport: FC = preview.Component;
export default RibbonLabelSupport;
