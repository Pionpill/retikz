import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './stack-inputs.controls';
import { renderStackPreview } from './stack-inputs.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderStackPreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
