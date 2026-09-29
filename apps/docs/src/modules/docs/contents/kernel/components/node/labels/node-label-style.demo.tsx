import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelStyleControls, previewControlContract } from './node-label-style.controls';
import { NodeLabelStylePreview } from './node-label-style.preview';

export const previewControls = nodeLabelStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeLabelStylePreview({
    textColor: values.textColor,
    fontSize: values.fontSize,
    opacity: values.opacity,
  }),
);

export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
