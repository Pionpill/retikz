import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, ribbonLabelControls } from './ribbon-label.controls';
import { renderRibbonLabelPreview } from './ribbon-label.preview';

export const previewControls = ribbonLabelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderRibbonLabelPreview(values, 'zh'),
);

export const previewSource = controlledPreview.source;

/** Ribbon 标注属性 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
