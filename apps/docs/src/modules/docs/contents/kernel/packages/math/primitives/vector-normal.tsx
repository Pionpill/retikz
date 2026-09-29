import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, vectorNormalControls } from './vector-normal.controls';
import { VectorNormalPreview } from './vector-normal.preview';

export const previewControls = vectorNormalControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  VectorNormalPreview({
    angle: values.angle,
    length: values.length,
  }),
);

export const previewSource = controlledPreview.source;

/** 通过方向角与长度观察向量及其左手法向量 */
const Demo: FC = controlledPreview.Component;

export default Demo;
