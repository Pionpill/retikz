import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { polygonPlaygroundControls, previewControlContract } from './polygon-playground.controls';
import { renderPolygonPlaygroundPreview } from './polygon-playground.preview';

export const previewControls = polygonPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderPolygonPlaygroundPreview({
    rotate: values.rotate,
    radius: values.radius,
    sides: values.sides,
    fill: values.fill,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
  }),
);

export const previewSource = controlledPreview.source;

/** Polygon 边数、外接圆与起始角 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
