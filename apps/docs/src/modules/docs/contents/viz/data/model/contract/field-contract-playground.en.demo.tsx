import { defineControlledPreview } from '@/modules/docs/preview';

import { fieldContractControls, previewControlContract } from './field-contract-playground.en.controls';
import { renderFieldContractPreview } from './field-contract-playground-preview';

/** Controls fallback for the field-contract playground */
export const previewControls = fieldContractControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderFieldContractPreview);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Dynamic playground for comparing field-type scale semantics */
export default controlledPreview.Component;
