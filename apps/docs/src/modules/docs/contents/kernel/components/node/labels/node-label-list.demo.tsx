import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelListControls, previewControlContract } from './node-label-list.controls';
import { NodeLabelListPreview } from './node-label-list.preview';

export const previewControls = nodeLabelListControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeLabelListPreview({
    mode: values.mode,
  }),
);

export const previewSource = controlledPreview.source;

const Demo = controlledPreview.Component;
export default Demo;
