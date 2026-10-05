import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './ribbon-nonlinear-width.controls';
import { renderRibbonNonlinearWidthPreview } from './ribbon-nonlinear-width.preview';

export { createPreviewControlContract } from './ribbon-nonlinear-width.controls';
export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, renderRibbonNonlinearWidthPreview);

export const previewSource = preview.source;

/** 起点、中段和终点宽度独立变化的流带 */
const RibbonNonlinearWidth: FC = preview.Component;
export default RibbonNonlinearWidth;
