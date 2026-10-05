import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { crowFootArrowControls, previewControlContract } from './crow-foot-arrow.controls';
import { renderCrowFootArrowPreview } from './crow-foot-arrow.preview';

export const previewControls = crowFootArrowControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderCrowFootArrowPreview({
    length: values.length,
    width: values.width,
    lineWidth: values.lineWidth,
    color: values.color,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定 CrowFoot marker 并调整端点视觉参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
