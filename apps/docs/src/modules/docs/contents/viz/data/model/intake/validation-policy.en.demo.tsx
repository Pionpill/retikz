import { defineControlledPreview } from '@/modules/docs/preview';

import { renderValidationPolicyPreview } from './validation-policy-preview';
import { previewControlContract, validationPolicyControls } from './validation-policy.en.controls';

/** Controls fallback for data validation */
export const previewControls = validationPolicyControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderValidationPolicyPreview(values, 'Validation failed'),
);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Dynamic playground for skip, sample, and strict validation */
const Preview = controlledPreview.Component;

export default Preview;
