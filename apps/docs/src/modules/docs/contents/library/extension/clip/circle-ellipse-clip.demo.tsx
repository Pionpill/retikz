import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { circleEllipseClipControls, previewControlContract } from './circle-ellipse-clip.controls';
import { renderCircleEllipseClipPreview } from './circle-ellipse-clip.preview';

export const previewControls = circleEllipseClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderCircleEllipseClipPreview({
    circleRadius: values.circleRadius,
    ellipseRadiusX: values.ellipseRadiusX,
    ellipseRadiusY: values.ellipseRadiusY,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定展示圆形与椭圆裁剪，并分别调整其半径 */
const Demo: FC = controlledPreview.Component;

export default Demo;
