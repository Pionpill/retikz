import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelPositionControls, previewControlContract } from './node-label-position.controls';
import { NodeLabelPositionPreview } from './node-label-position.preview';

export const previewControls = nodeLabelPositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeLabelPositionPreview({
    positionMode: values.positionMode,
    positionAngle: values.positionAngle,
    boundary: values.boundary,
    fraction: values.fraction,
    direction: values.direction,
  }),
);

export const previewSource = controlledPreview.source;

const Demo = controlledPreview.Component;
export default Demo;
