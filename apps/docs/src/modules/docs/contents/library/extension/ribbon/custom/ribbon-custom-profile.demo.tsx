import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './ribbon-custom-profile.controls';
import { renderRibbonCustomProfilePreview } from './ribbon-custom-profile.preview';

export { createPreviewControlContract } from './ribbon-custom-profile.controls';
export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, values => renderRibbonCustomProfilePreview(values));
export const previewSource = preview.source;

/** 自定义 Ribbon 宽度 profile 的定义、注入与引用闭环 */
const Demo: FC = preview.Component;

export default Demo;
