import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './array-labels.controls';
import { renderArrayLabelsPreview } from './array-labels.preview';

/** Fallback controls for preview registration. */
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderArrayLabelsPreview({
    text: values.text,
    positionMode: values.positionMode,
    boundary: values.boundary,
    fraction: values.fraction,
    direction: values.direction,
    align: values.align,
    distance: values.distance,
    rotate: values.rotate,
    fontSize: values.fontSize,
    color: values.color,
    pin: values.pin,
  }),
);

export const previewSource = controlledPreview.source;

const Demo = controlledPreview.Component;
export default Demo;
