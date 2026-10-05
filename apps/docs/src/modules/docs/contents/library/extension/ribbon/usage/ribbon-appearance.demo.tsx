import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './ribbon-appearance.controls';
import { renderRibbonAppearancePreview } from './ribbon-appearance.preview';

export { createPreviewControlContract } from './ribbon-appearance.controls';
export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, renderRibbonAppearancePreview);

export const previewSource = preview.source;

/** 流带外观交互示例 */
const Demo: FC = preview.Component;
export default Demo;
