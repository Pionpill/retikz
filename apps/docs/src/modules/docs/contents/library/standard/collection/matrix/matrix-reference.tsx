import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './matrix-reference.controls';
import { renderMatrixPreview } from './matrix-reference.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderMatrixPreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
