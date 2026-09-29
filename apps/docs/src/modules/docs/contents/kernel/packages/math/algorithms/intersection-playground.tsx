import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { intersectionPlaygroundControls, previewControlContract } from './intersection-playground.controls';
import { IntersectionPlaygroundPreview } from './intersection-playground.preview';

export const previewControls = intersectionPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  IntersectionPlaygroundPreview(values),
);

export const previewSource = controlledPreview.source;

/** 在固定取景中比较不同几何对象的求交及退化结果 */
const Demo: FC = controlledPreview.Component;

export default Demo;
