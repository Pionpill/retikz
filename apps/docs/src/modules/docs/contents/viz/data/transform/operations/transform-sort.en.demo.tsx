import { defineControlledPreview } from '@/modules/docs/preview';

import { renderTransformSortPreview } from './transform-sort-preview';
import { previewControlContract, transformSortControls } from './transform-sort.en.controls';

/** Registers fallback controls for the row-sort example */
export const previewControls = transformSortControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSortPreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Compares source row order with the controlled sort output */
const Preview = controlledPreview.Component;

export default Preview;
