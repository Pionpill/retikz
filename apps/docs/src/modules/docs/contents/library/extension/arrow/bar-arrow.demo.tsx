import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { barArrowControls, previewControlContract } from './bar-arrow.controls';
import { renderBarArrowPreview } from './bar-arrow.preview';

export const previewControls = barArrowControls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderBarArrowPreview({
    length: values.length,
    width: values.width,
    lineWidth: values.lineWidth,
    color: values.color,
  }),
);
export const previewSource = controlledPreview.source;
/** 固定 Bar marker 并调整端点视觉参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
