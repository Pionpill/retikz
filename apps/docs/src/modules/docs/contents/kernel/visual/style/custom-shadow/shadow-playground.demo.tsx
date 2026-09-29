import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, shadowPlaygroundControls } from './shadow-playground.controls';
import { ShadowPlaygroundPreview } from './shadow-playground.preview';

export const previewControls = shadowPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ShadowPlaygroundPreview({
    offsetX: values.offsetX,
    offsetY: values.offsetY,
    blur: values.blur,
    color: values.color,
    opacity: values.opacity,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定一张卡片，让面板只探索 shadow 对象的连续参数 */
const Demo: FC = controlledPreview.Component;

export default Demo;
