import { defineControlledPreview } from '@/modules/docs/preview';

import { extensionFormatControls, previewControlContract } from './extension-format.en.controls';
import { renderExtensionFormatPreview } from './extension-format-preview';

/** Controls fallback for the named-format example */
export const previewControls = extensionFormatControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionFormatPreview);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Complete Definition, injection, and model-reference example */
export default controlledPreview.Component;
