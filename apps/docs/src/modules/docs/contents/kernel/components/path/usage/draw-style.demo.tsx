import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawStyleControls, previewControlContract } from './draw-style.controls';
import { DrawStylePreview } from './draw-style.preview';

export const previewControls = drawStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  DrawStylePreview({
    roundedCorners: values.roundedCorners,
    arrow: values.arrow,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
    dashed: values.dashed,
    dashOffset: values.dashOffset,
  }),
);

export const previewSource = controlledPreview.source;

/** Draw 开放路径外观 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
