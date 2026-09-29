import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { diamondArrowsControls, previewControlContract } from './diamond-arrows.controls';
import { renderDiamondArrowsPreview } from './diamond-arrows.preview';

export const previewControls = diamondArrowsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderDiamondArrowsPreview({
    color: values.color,
    scale: values.scale,
    lineWidth: values.lineWidth,
  }),
);

export const previewSource = controlledPreview.source;

/** 对照实心与空心菱形箭头 */
const Demo: FC = controlledPreview.Component;

export default Demo;
