import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathStrokePaintControls, previewControlContract } from './path-stroke-paint.controls';
import { PathStrokePaintPreview } from './path-stroke-paint.preview';

export const previewControls = pathStrokePaintControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathStrokePaintPreview({
    startColor: values.startColor,
    middleColor: values.middleColor,
    endColor: values.endColor,
    gradientKind: values.gradientKind,
    linearAngle: values.linearAngle,
    center: values.center,
    radius: values.radius,
    conicAngle: values.conicAngle,
  }),
);

export const previewSource = controlledPreview.source;

/** Path 渐变描边 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
