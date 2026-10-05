import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './matrix-skeleton.controls';
import { renderMatrixPreview } from './matrix-skeleton.preview';

export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, values => renderMatrixPreview(values));

export const previewSource = preview.source;

const Demo = preview.Component;
export default Demo;
