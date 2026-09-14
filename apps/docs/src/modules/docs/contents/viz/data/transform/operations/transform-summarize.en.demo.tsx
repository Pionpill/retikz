import { defineControlledPreview } from '@/modules/docs/preview';

import { renderTransformSummarizePreview } from './transform-summarize-preview';
import { previewControlContract, transformSummarizeControls } from './transform-summarize.en.controls';

/** Registers fallback controls for the grouped-summary example */
export const previewControls = transformSummarizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSummarizePreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Switches the reducer and displays the grouped output */
const Preview = controlledPreview.Component;

export default Preview;
