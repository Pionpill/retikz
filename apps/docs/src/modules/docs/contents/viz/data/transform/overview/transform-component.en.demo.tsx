import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformComponentControls } from './transform-component.en.controls';
import { renderTransformComponentPreview } from './transform-component-preview';

/** Registers fallback controls for the Transform input example */
export const previewControls = transformComponentControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformComponentPreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Shows the fixed Transform declaration order together with its input rows */
export default controlledPreview.Component;
