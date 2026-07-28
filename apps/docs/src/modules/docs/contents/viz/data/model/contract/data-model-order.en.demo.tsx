import { defineControlledPreview } from '@/modules/docs/preview';

import { dataModelOrderControls, previewControlContract } from './data-model-order.en.controls';
import { renderDataModelOrderPreview } from './data-model-order-preview';

/** Controls fallback for the category-order example */
export const previewControls = dataModelOrderControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderDataModelOrderPreview);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Dynamic category-domain ordering playground with fixed source rows */
export default controlledPreview.Component;
