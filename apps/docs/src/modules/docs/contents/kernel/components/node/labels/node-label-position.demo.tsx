import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelPositionControls, previewControlContract } from './node-label-position.controls';
import { NodeLabelPositionPreview } from './node-label-position.preview';

export const previewControls = nodeLabelPositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeLabelPositionPreview({
    positionMode: values.positionMode,
    positionAngle: values.positionAngle,
    side: values.side,
    fraction: values.fraction,
    direction: values.direction,
  }),
);

export const previewSource = controlledPreview.source;

const Demo = controlledPreview.Component;
export default Demo;
