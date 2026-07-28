import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformSummarizeControls } from './transform-summarize.en.controls';
import { renderTransformSummarizePreview } from './transform-summarize-preview';

/** Registers fallback controls for the grouped-summary example */
export const previewControls = transformSummarizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSummarizePreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Switches the reducer and displays the grouped output */
export default controlledPreview.Component;
