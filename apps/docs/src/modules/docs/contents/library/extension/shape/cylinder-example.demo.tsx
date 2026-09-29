import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { cylinderExampleControls, previewControlContract } from './cylinder-example.controls';
import { renderCylinderExamplePreview } from './cylinder-example.preview';

export const previewControls = cylinderExampleControls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderCylinderExamplePreview({
    axis: values.axis,
    capDepth: values.capDepth,
  }),
);
export const previewSource = controlledPreview.source;
/** 固定 Cylinder 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
