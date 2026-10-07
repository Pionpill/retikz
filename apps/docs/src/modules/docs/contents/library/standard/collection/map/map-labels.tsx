import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './map-labels.controls';
import { renderMapLabelsPreview } from './map-labels.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderMapLabelsPreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
