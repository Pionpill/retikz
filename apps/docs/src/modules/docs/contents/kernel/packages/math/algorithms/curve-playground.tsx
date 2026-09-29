import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { curvePlaygroundControls, previewControlContract } from './curve-playground.controls';
import { CurvePlaygroundPreview } from './curve-playground.preview';

export const previewControls = curvePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CurvePlaygroundPreview({
    pointSet: values.pointSet,
    controlPoint: values.controlPoint,
    tension: values.tension,
  }),
);

export const previewSource = controlledPreview.source;

/** 直接渲染 math 返回的 CubicSegment，并保留可移动 knot 与折线参照 */
const Demo: FC = controlledPreview.Component;

export default Demo;
