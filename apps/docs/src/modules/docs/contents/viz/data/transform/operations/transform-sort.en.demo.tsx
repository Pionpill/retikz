import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformSortControls } from './transform-sort.en.controls';
import { renderTransformSortPreview } from './transform-sort-preview';

/** Registers fallback controls for the row-sort example */
export const previewControls = transformSortControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSortPreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Compares source row order with the controlled sort output */
export default controlledPreview.Component;
