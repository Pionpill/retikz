import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformSelectControls } from './transform-select.en.controls';
import { renderTransformSelectPreview } from './transform-select-preview';

/** Registers fallback controls for the representative-row example */
export const previewControls = transformSelectControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSelectPreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Switches selector kind, rank count, and tie handling */
export default controlledPreview.Component;
