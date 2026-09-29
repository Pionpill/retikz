import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { blendPlaygroundControls, previewControlContract } from './blend-playground.controls';
import { BlendPlaygroundPreview } from './blend-playground.preview';

export const previewControls = blendPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BlendPlaygroundPreview({
    mode: values.mode,
    background: values.background,
    sourceA: values.sourceA,
    sourceB: values.sourceB,
    opacity: values.opacity,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定重叠结构，让面板探索全部 blendMode 与输入颜色 */
const Demo: FC = controlledPreview.Component;

export default Demo;
