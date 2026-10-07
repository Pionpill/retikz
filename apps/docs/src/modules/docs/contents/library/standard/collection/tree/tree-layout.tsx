import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './tree-layout.controls';
import { renderTreePreview } from './tree-layout.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderTreePreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
