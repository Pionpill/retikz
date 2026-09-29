import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { arrowAppearanceControls, previewControlContract } from './arrow-appearance.controls';
import { ArrowAppearancePreview } from './arrow-appearance.preview';

export const previewControls = arrowAppearanceControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ArrowAppearancePreview({
    direction: values.direction,
    shape: values.shape,
    color: values.color,
    scale: values.scale,
    length: values.length,
    width: values.width,
    opacity: values.opacity,
    separateEnds: values.separateEnds,
    startShape: values.startShape,
    startColor: values.startColor,
    endShape: values.endShape,
    endColor: values.endColor,
  }),
);

export const previewSource = controlledPreview.source;

/** Arrow 方向、形状、起末覆盖与外观 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
