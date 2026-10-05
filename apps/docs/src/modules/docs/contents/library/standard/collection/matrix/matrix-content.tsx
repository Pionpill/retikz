import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './matrix-content.controls';
import { renderMatrixPreview } from './matrix-content.preview';

export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, values => renderMatrixPreview(values));

export const previewSource = preview.source;

const Demo = preview.Component;
export default Demo;
