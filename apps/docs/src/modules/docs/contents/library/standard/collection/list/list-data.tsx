import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './list-data.controls';
import { renderListDataPreview } from './list-data.preview';

/** Fallback controls for preview registration. */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderListDataPreview({
    dataObjectDisplay: values.dataObjectDisplay,
  }),
);
export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
