import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, trapezoidExampleControls } from './trapezoid-example.controls';
import { renderTrapezoidExamplePreview } from './trapezoid-example.preview';

export const previewControls = trapezoidExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderTrapezoidExamplePreview({
    shortSide: values.shortSide,
    shortSideRatio: values.shortSideRatio,
    cornerRadius: values.cornerRadius,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定 Trapezoid 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;

export default Demo;
