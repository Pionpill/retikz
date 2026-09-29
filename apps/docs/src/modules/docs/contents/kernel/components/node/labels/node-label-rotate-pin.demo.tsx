import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelRotatePinControls, previewControlContract } from './node-label-rotate-pin.controls';
import { NodeLabelRotatePinPreview } from './node-label-rotate-pin.preview';

export const previewControls = nodeLabelRotatePinControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeLabelRotatePinPreview({
    rotateMode: values.rotateMode,
    rotateAngle: values.rotateAngle,
    pinStyle: values.pinStyle,
    pinColor: values.pinColor,
    pinWidth: values.pinWidth,
    pinDashOffset: values.pinDashOffset,
    keepUpright: values.keepUpright,
  }),
);

export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
