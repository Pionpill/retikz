import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelSpacingControls, previewControlContract } from './node-label-spacing.controls';
import { NodeLabelSpacingPreview } from './node-label-spacing.preview';

export const previewControls = nodeLabelSpacingControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeLabelSpacingPreview({
    direction: values.direction,
    placement: values.placement,
    distance: values.distance,
  }),
);

export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
