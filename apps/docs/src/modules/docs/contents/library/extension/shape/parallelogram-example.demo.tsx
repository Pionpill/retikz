import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { parallelogramExampleControls, previewControlContract } from './parallelogram-example.controls';
import { renderParallelogramExamplePreview } from './parallelogram-example.preview';

export const previewControls = parallelogramExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderParallelogramExamplePreview({
    slantDirection: values.slantDirection,
    slantAngle: values.slantAngle,
    cornerRadius: values.cornerRadius,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定 Parallelogram 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
