import { defineControlledPreview } from '@/modules/docs/preview';

import { renderSourceBindingPreview } from './source-binding-preview';
import { previewControlContract, sourceBindingControls } from './source-binding.en.controls';

/** Controls fallback for source binding */
export const previewControls = sourceBindingControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderSourceBindingPreview);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Dynamic source-switching playground with stable consumer fields */
const Preview = controlledPreview.Component;

export default Preview;
