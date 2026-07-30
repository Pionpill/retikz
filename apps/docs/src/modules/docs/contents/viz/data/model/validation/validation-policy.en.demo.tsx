import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, validationPolicyControls } from './validation-policy.en.controls';
import { renderValidationPolicyPreview } from './validation-policy-preview';

/** Controls fallback for data validation */
export const previewControls = validationPolicyControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderValidationPolicyPreview(values, 'Validation failed'),
);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Dynamic playground for skip, sample, and strict validation */
export default controlledPreview.Component;
