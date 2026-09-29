import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, rayArcPlaygroundControls } from './ray-arc.controls';
import { RayArcPreview } from './ray-arc.preview';

export const previewControls = rayArcPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RayArcPreview({
    startAngle: values.startAngle,
    endAngle: values.endAngle,
  }),
);

export const previewSource = controlledPreview.source;

/** 受控展示射线与圆弧的交点 */
const Demo: FC = controlledPreview.Component;

export default Demo;
