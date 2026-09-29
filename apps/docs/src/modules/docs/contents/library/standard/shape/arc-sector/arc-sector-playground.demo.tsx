import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { arcSectorPlaygroundControls, previewControlContract } from './arc-sector-playground.controls';
import { renderArcSectorPlaygroundPreview } from './arc-sector-playground.preview';

export const previewControls = arcSectorPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderArcSectorPlaygroundPreview({
    radiusX: values.radiusX,
    radiusY: values.radiusY,
    hollow: values.hollow,
    innerRatio: values.innerRatio,
    startAngle: values.startAngle,
    endAngle: values.endAngle,
    arcClose: values.arcClose,
    fill: values.fill,
    stroke: values.stroke,
  }),
);

export const previewSource = controlledPreview.source;

/** Arc 与 Sector 共享半径、角度和闭合语义的 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
