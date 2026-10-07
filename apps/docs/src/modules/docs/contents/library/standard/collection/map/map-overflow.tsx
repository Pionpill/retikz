import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './map-overflow.controls';
import { renderMapOverflowPreview } from './map-overflow.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderMapOverflowPreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
