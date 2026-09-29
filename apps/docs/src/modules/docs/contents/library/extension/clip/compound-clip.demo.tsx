import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { compoundClipControls, previewControlContract } from './compound-clip.controls';
import { renderCompoundClipPreview } from './compound-clip.preview';

export const previewControls = compoundClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderCompoundClipPreview({
    fillRule: values.fillRule,
    offset: values.offset,
    radius: values.radius,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定两个圆形 child，并调整其几何参数与组合填充规则 */
const Demo: FC = controlledPreview.Component;

export default Demo;
