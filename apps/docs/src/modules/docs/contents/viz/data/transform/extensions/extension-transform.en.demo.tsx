import { defineControlledPreview } from '@/modules/docs/preview';

import { renderExtensionTransformPreview } from './extension-transform-preview';
import { extensionTransformControls, previewControlContract } from './extension-transform.en.controls';

/** Registers fallback controls for the custom-transform example */
export const previewControls = extensionTransformControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionTransformPreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Adjusts a JSON-safe factor and compares source with derived values */
const Preview = controlledPreview.Component;

export default Preview;
