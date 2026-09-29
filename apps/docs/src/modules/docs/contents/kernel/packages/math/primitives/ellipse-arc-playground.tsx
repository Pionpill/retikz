import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { ellipseArcPlaygroundControls, previewControlContract } from './ellipse-arc-playground.controls';
import { EllipseArcPlaygroundPreview } from './ellipse-arc-playground.preview';

export const previewControls = ellipseArcPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  EllipseArcPlaygroundPreview({
    ellipseRadiusX: values.ellipseRadiusX,
    ellipseRadiusY: values.ellipseRadiusY,
    arcRadius: values.arcRadius,
    arcStartAngle: values.arcStartAngle,
    arcEndAngle: values.arcEndAngle,
  }),
);

export const previewSource = controlledPreview.source;

/** 通过面板绘制椭圆与圆弧，并显示各自的轴对齐边界 */
const Demo: FC = controlledPreview.Component;

export default Demo;
