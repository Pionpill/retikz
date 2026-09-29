import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, starPlaygroundControls } from './star-playground.controls';
import { renderStarPlaygroundPreview } from './star-playground.preview';

export const previewControls = starPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderStarPlaygroundPreview({
    outerRadius: values.outerRadius,
    innerRatio: values.innerRatio,
    points: values.points,
    rotate: values.rotate,
    fill: values.fill,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
  }),
);

export const previewSource = controlledPreview.source;

/** Star 内外半径、角数与起始角 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
