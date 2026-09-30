import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './ribbon-boundary.controls';
import { renderRibbonBoundaryPreview } from './ribbon-boundary.preview';

export { createPreviewControlContract } from './ribbon-boundary.controls';
export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, values => renderRibbonBoundaryPreview(values));
export const previewSource = preview.source;

/** 预计算边界模式的交互预览 */
const Demo: FC = preview.Component;

export default Demo;
