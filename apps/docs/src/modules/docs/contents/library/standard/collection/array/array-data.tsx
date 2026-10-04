import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './array-data.controls';
import { renderArrayDataPreview } from './array-data.preview';

/** Fallback controls for preview registration. */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderArrayDataPreview({
    dataExpand: values.dataExpand,
  }),
);
export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
